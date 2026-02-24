import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc.js'
import { VertexAI, type Tool } from '@google-cloud/vertexai'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getDb } from '../../lib/firebase.js'

// ─────────────────────────────────────────────────────────────────
// Config — read from environment (set in Firebase Function config
// or .env for local dev)
// ─────────────────────────────────────────────────────────────────

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? 'health-lifeline-53fb3'
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? 'europe-west2'
const CORPUS_ID = process.env.RAG_CORPUS_ID ?? '7631349568579305472'

const RAG_CORPUS_RESOURCE = `projects/${PROJECT}/locations/${LOCATION}/ragCorpora/${CORPUS_ID}`

// ─────────────────────────────────────────────────────────────────
// VertexAI client — lazily initialised on first request so the
// Firebase CLI can inspect exported functions without timing out
// ─────────────────────────────────────────────────────────────────

let _model: ReturnType<VertexAI['getGenerativeModel']> | null = null

function getModel() {
  if (!_model) {
    const vertexAI = new VertexAI({ project: PROJECT, location: LOCATION })
    _model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: {
        role: 'system',
        parts: [
          {
            text:
              'You are a Zambian Health Assistant. Answer questions clearly and consicely, keep things simple ' +
              'using only the health documents provided to you as context. ' +
              'If the documents do not contain enough information to answer, say so honestly. ' +
              'Never fabricate medical facts.',
          },
        ],
      },
    })
  }
  return _model
}

// ─────────────────────────────────────────────────────────────────
// RAG retrieval tool — tells Vertex AI to fetch relevant chunks
// from the corpus before generating an answer
// ─────────────────────────────────────────────────────────────────

const ragTool: Tool = {
  retrieval: {
    vertexRagStore: {
      ragResources: [{ ragCorpus: RAG_CORPUS_RESOURCE }],
      similarityTopK: 5,
    },
  },
}

// ─────────────────────────────────────────────────────────────────
// I/O schemas
// ─────────────────────────────────────────────────────────────────

const SendMessageInput = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string(),
  uid: z.string().min(1),
})

const SendMessageOutput = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
  conversationId: z.string(),
})

const EditMessageInput = z.object({
  messageId: z.string().min(1),
  newMessage: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().min(1),
  uid: z.string().min(1),
})

const EditMessageOutput = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
})

const DeleteMessageInput = z.object({
  messageId: z.string().min(1),
  conversationId: z.string().min(1),
  uid: z.string().min(1),
})

const ListConversationsInput = z.object({
  uid: z.string().min(1),
  search: z.string().optional(),
  cursor: z.number().optional(), // page offset
})

const ConversationItem = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ListConversationsOutput = z.object({
  conversations: z.array(ConversationItem),
  nextCursor: z.number().nullable(),
})

// ─────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────

export const chatRouter = router({
  sendMessage: publicProcedure
    .input(SendMessageInput)
    .output(SendMessageOutput)
    .mutation(async ({ input }) => {
      const db = getDb()
      try {
        // ── 1. Resolve or create the conversation ──────────────────
        let convId = input.conversationId
        if (convId === 'new') {
          const convRef = db.collection('conversations').doc()
          convId = convRef.id
          await convRef.set({
            uid: input.uid,
            title: input.message.slice(0, 60),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            deletedAt: null,
          })
        }

        // ── 2. Persist the user message ────────────────────────────
        await db.collection('conversations').doc(convId).collection('messages').doc().set({
          uid: input.uid,
          conversationId: convId,
          role: 'user',
          content: input.message,
          version: 'v1',
          citations: [],
          createdAt: FieldValue.serverTimestamp(),
          deletedAt: null,
        })

        // ── 3. Call Vertex AI ──────────────────────────────────────
        const result = await getModel().generateContent({
          tools: [ragTool],
          contents: [
            {
              role: 'user',
              parts: [{ text: input.message }],
            },
          ],
        })

        const response = result.response

        // Extract the text answer from the first candidate
        const candidate = response.candidates?.[0]
        const answerText =
          candidate?.content?.parts?.map(p => p.text ?? '').join('') ??
          'I was unable to generate a response. Please try again.'

        // Extract source URIs from grounding metadata if present
        const sources: string[] = []
        const groundingMetadata = candidate?.groundingMetadata

        if (groundingMetadata) {
          const chunks =
            (groundingMetadata.groundingChunks as
              | Array<{ retrievedContext?: { uri?: string } }>
              | undefined) ?? []

          for (const chunk of chunks) {
            const uri = chunk.retrievedContext?.uri
            if (uri && !sources.includes(uri)) {
              sources.push(uri)
            }
          }
        }

        // ── 4. Persist the assistant message ───────────────────────
        await db.collection('conversations').doc(convId).collection('messages').doc().set({
          uid: input.uid,
          conversationId: convId,
          role: 'assistant',
          content: answerText,
          version: 'v1',
          citations: sources,
          createdAt: FieldValue.serverTimestamp(),
          deletedAt: null,
        })

        // ── 5. Bump conversation updatedAt ─────────────────────────
        await db.collection('conversations').doc(convId).update({
          updatedAt: FieldValue.serverTimestamp(),
        })

        return { answer: answerText, sources, conversationId: convId }
      } catch (error: unknown) {
        // ──────────────────────────────────────────────────────────
        // IAM debugging: log 403 Permission Denied errors clearly
        // ──────────────────────────────────────────────────────────
        const isPermissionDenied =
          (error instanceof Error && error.message.includes('403')) ||
          (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: number }).code === 403)

        if (isPermissionDenied) {
          console.error(
            '[chat] 403 Permission Denied — the Firebase service account does not yet have ' +
              'the "Vertex AI User" IAM role on project ' +
              PROJECT +
              '. Wait a few minutes for IAM propagation and try again.',
            error
          )
        } else {
          console.error('[chat] Unexpected error calling Vertex AI:', error)
        }

        // Re-throw so tRPC returns an Internal Server Error to the client
        throw error
      }
    }),

  // ─────────────────────────────────────────────────────────────────
  // editMessage — soft-delete the original user+assistant pair, then
  // create a new pair with the updated text and a fresh AI response.
  // ─────────────────────────────────────────────────────────────────
  editMessage: publicProcedure
    .input(EditMessageInput)
    .output(EditMessageOutput)
    .mutation(async ({ input }) => {
      const db = getDb()
      const messagesRef = db
        .collection('conversations')
        .doc(input.conversationId)
        .collection('messages')

      // ── 1. Verify the original user message exists and is owned ──
      const userMsgDoc = await messagesRef.doc(input.messageId).get()
      if (!userMsgDoc.exists || userMsgDoc.data()?.uid !== input.uid) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' })
      }
      const userMsgData = userMsgDoc.data()!

      // ── 2. Soft-delete the original user message ─────────────────
      await messagesRef.doc(input.messageId).update({
        deletedAt: FieldValue.serverTimestamp(),
      })

      // ── 3. Soft-delete ALL messages after the edited one ─────────
      // This prunes the entire branch that followed the old message,
      // keeping only the conversation history up to (but not including)
      // the edited turn.
      const subsequentSnap = await messagesRef
        .where('uid', '==', input.uid)
        .where('deletedAt', '==', null)
        .where('createdAt', '>', userMsgData.createdAt)
        .get()

      if (!subsequentSnap.empty) {
        const batch = db.batch()
        for (const doc of subsequentSnap.docs) {
          batch.update(doc.ref, { deletedAt: FieldValue.serverTimestamp() })
        }
        await batch.commit()
      }

      // ── 4. Persist the new user message ──────────────────────────
      await messagesRef.doc().set({
        uid: input.uid,
        conversationId: input.conversationId,
        role: 'user',
        content: input.newMessage,
        version: 'v1',
        citations: [],
        createdAt: FieldValue.serverTimestamp(),
        deletedAt: null,
      })

      // ── 5. Call Vertex AI with the updated message ────────────────
      const result = await getModel().generateContent({
        tools: [ragTool],
        contents: [{ role: 'user', parts: [{ text: input.newMessage }] }],
      })

      const candidate = result.response.candidates?.[0]
      const answerText =
        candidate?.content?.parts?.map(p => p.text ?? '').join('') ??
        'I was unable to generate a response. Please try again.'

      const sources: string[] = []
      const groundingMetadata = candidate?.groundingMetadata
      if (groundingMetadata) {
        const chunks =
          (groundingMetadata.groundingChunks as
            | Array<{ retrievedContext?: { uri?: string } }>
            | undefined) ?? []
        for (const chunk of chunks) {
          const uri = chunk.retrievedContext?.uri
          if (uri && !sources.includes(uri)) sources.push(uri)
        }
      }

      // ── 6. Persist the new assistant message ─────────────────────
      await messagesRef.doc().set({
        uid: input.uid,
        conversationId: input.conversationId,
        role: 'assistant',
        content: answerText,
        version: 'v1',
        citations: sources,
        createdAt: FieldValue.serverTimestamp(),
        deletedAt: null,
      })

      // ── 7. Bump conversation updatedAt ────────────────────────────
      await db.collection('conversations').doc(input.conversationId).update({
        updatedAt: FieldValue.serverTimestamp(),
      })

      return { answer: answerText, sources }
    }),

  // ─────────────────────────────────────────────────────────────────
  // deleteMessage — soft-delete a user message and its paired
  // assistant response (the next message in the conversation).
  // ─────────────────────────────────────────────────────────────────
  deleteMessage: publicProcedure.input(DeleteMessageInput).mutation(async ({ input }) => {
    const db = getDb()
    const messagesRef = db
      .collection('conversations')
      .doc(input.conversationId)
      .collection('messages')

    // ── 1. Verify ownership ───────────────────────────────────────
    const msgDoc = await messagesRef.doc(input.messageId).get()
    if (!msgDoc.exists || msgDoc.data()?.uid !== input.uid) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' })
    }
    const msgData = msgDoc.data()!

    // ── 2. Soft-delete the message ────────────────────────────────
    await messagesRef.doc(input.messageId).update({
      deletedAt: FieldValue.serverTimestamp(),
    })

    // ── 3. For user messages, also soft-delete the paired response ─
    if (msgData.role === 'user') {
      const nextSnap = await messagesRef
        .where('uid', '==', input.uid)
        .where('deletedAt', '==', null)
        .where('createdAt', '>', msgData.createdAt)
        .orderBy('createdAt', 'asc')
        .limit(1)
        .get()

      if (!nextSnap.empty && nextSnap.docs[0].data().role === 'assistant') {
        await messagesRef.doc(nextSnap.docs[0].id).update({
          deletedAt: FieldValue.serverTimestamp(),
        })
      }
    }

    // ── 4. If no messages remain, soft-delete the conversation ────
    const remainingSnap = await messagesRef
      .where('uid', '==', input.uid)
      .where('deletedAt', '==', null)
      .limit(1)
      .get()

    if (remainingSnap.empty) {
      await db.collection('conversations').doc(input.conversationId).update({
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  }),

  // ─────────────────────────────────────────────────────────────────
  // listConversations — paginated + searchable list of conversations.
  // Search is substring-matched server-side (Firestore has no native
  // full-text search, so we filter in memory after fetching the user's
  // conversations). Pagination uses a numeric offset cursor.
  // ─────────────────────────────────────────────────────────────────
  listConversations: publicProcedure
    .input(ListConversationsInput)
    .output(ListConversationsOutput)
    .query(async ({ input }) => {
      const db = getDb()
      const LIMIT = 10
      const offset = input.cursor ?? 0

      const baseSnap = await db
        .collection('conversations')
        .where('uid', '==', input.uid)
        .where('deletedAt', '==', null)
        .orderBy('updatedAt', 'desc')
        .get()

      const allDocs = input.search
        ? baseSnap.docs.filter(doc =>
            (doc.data().title as string).toLowerCase().includes(input.search!.toLowerCase())
          )
        : baseSnap.docs

      const page = allDocs.slice(offset, offset + LIMIT + 1)
      const hasMore = page.length > LIMIT
      const docs = hasMore ? page.slice(0, LIMIT) : page

      const conversations = docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          title: d.title as string,
          createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
          updatedAt: (d.updatedAt as Timestamp).toDate().toISOString(),
        }
      })

      return {
        conversations,
        nextCursor: hasMore ? offset + LIMIT : null,
      }
    }),
})
