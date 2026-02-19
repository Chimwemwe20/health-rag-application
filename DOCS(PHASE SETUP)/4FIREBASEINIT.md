CREATED THE FIRBASE APP ON THE FIREBASE CONSOLE
INITIALIZED FIREBASE IN PROJECT
ADDED FIREBASE TO APPS/WEB
ADDED FIREBASE-ADMIN TO APPS/FUNCTIONS

RUNNING FIREBASE INIT WORKED UNTIL ERROR

TERMINAL WORKFLOW BELOW

> firebase init

     ######## #### ########  ######## ########     ###     ######  ########
     ##        ##  ##     ## ##       ##     ##  ##   ##  ##       ##
     ######    ##  ########  ######   ########  #########  ######  ######
     ##        ##  ##    ##  ##       ##     ## ##     ##       ## ##
     ##       #### ##     ## ######## ########  ##     ##  ######  ########

You're about to initialize a Firebase project in this directory:

C:\Users\T490\Desktop\Hytel\health-rag-application

Before we get started, keep in mind:

- You are initializing within an existing Firebase project directory

✔ Are you ready to proceed? Yes
✔ Which Firebase features do you want to set up for this directory? Press Space to select features, then Enter to confirm your choices.  
Firestore: Configure security rules and indexes files for Firestore, Functions: Configure a Cloud Functions directory and its files,  
Hosting: Set up deployments for static web apps

=== Project Setup

First, let's associate this project directory with a Firebase project.
You can create multiple project aliases by running firebase use --add,

✔ Please select an option: Use an existing project
✔ Select a default Firebase project for this directory: health-lifeline-53fb3 (Health-LifeLine )

=== Firestore Setup
i firestore: ensuring required API firestore.googleapis.com is enabled...

- firestore: required API firestore.googleapis.com is enabled
  ✔ Please select the location of your Firestore database: us-central1

Firestore Security Rules allow you to define how and when to allow
requests. You can keep these rules in your project directory
and publish them with firebase deploy.

✔ File firestore.rules already exists. Overwrite? No
i Skipping write of firestore.rules

Firestore indexes allow you to perform complex queries while
maintaining performance that scales with the size of the result
set. You can keep index definitions in your project directory
and publish them with firebase deploy.

✔ File firestore.indexes.json already exists. Overwrite? No
i Skipping write of firestore.indexes.json

=== Functions Setup

Detected existing codebase(s): default

✔ Would you like to initialize a new codebase, or overwrite an existing one? Overwrite

Overwriting codebase default...

✔ What language would you like to use to write Cloud Functions? TypeScript
✔ Do you want to use ESLint to catch probable bugs and enforce style? Yes
✔ File apps/functions/package.json already exists. Overwrite? No
i Skipping write of apps/functions/package.json

- Wrote apps/functions/.eslintrc.js
- Wrote apps/functions/tsconfig.dev.json
  ✔ File apps/functions/tsconfig.json already exists. Overwrite? No
  i Skipping write of apps/functions/tsconfig.json
  ✔ File apps/functions/src/index.ts already exists. Overwrite? No
  i Skipping write of apps/functions/src/index.ts
- Wrote apps/functions/.gitignore
  ✔ Do you want to install dependencies with npm now? No

=== Hosting Setup

Your public directory is the folder (relative to your project directory) that
will contain Hosting assets to be uploaded with firebase deploy. If you
have a build process for your assets, use your build's output directory.

✔ What do you want to use as your public directory? public
✔ Configure as a single-page app (rewrite all urls to /index.html)? No
✔ Set up automatic builds and deploys with GitHub? Yes

i Detected a .git folder at C:\Users\T490\Desktop\Hytel\health-rag-application
i Authorizing with GitHub to upload your service account to a GitHub repository's secrets store.

Visit this URL on this device to log in:
https://github.com/login/oauth/authorize?client_id=89cf50f02ac6aaed3484&state=649138079&redirect_uri=http%3A%2F%2Flocalhost%3A9005&scope=read%3Auser%20repo%20public_repo

Waiting for authentication...

- Success! Logged into GitHub as Chimwemwe20

✔ For which GitHub repository would you like to set up a GitHub workflow? (format: user/repository) Chimwemwe20/health-rag-application

Error: Request to https://iam.googleapis.com/v1/projects/health-lifeline-53fb3/serviceAccounts/github-action-1159254180@health-lifeline-53fb3.iam.gserviceaccount.com/keys had HTTP Error: 400, Key creation is not allowed on this service account.

ALTERNATIVE APPROACH FOR SECRETS
USE FIREBASE AUTH TOKEN IF PROCESS BECOMES TROUBLESOME, DEPLOY LOCALLY USING FIREBASE CLI
