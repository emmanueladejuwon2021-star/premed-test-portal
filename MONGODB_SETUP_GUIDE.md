# MongoDB Setup Guide

You have successfully migrated the academic portal from Firebase to MongoDB! Here's everything you need to know about how your project connects to MongoDB and how you can manage it with minimal stress.

## 1. Where is the Connection String?

Your database connection string is stored securely in the `.env` file at the root of your project:
```env
MONGODB_URI=mongodb+srv://premedtestportal:20252026@cluster0.jqcmhc6.mongodb.net/premedtestportal?retryWrites=true&w=majority&appName=Cluster0
```
*   The connection logic is handled safely in `src/db.ts` using `mongoose`. 
*   When your Express server starts (`server.ts`), it automatically imports and runs `connectDB()`.

## 2. Managing Your Collections (The "Minimal Stress" Way)

You do **not** need to manually create tables or collections ahead of time! 
Mongoose handles this automatically for you.

When the application runs and saves a record (e.g., when a student registers or an admin adds a course), MongoDB will automatically create the collections:
*   `students`
*   `courses`
*   `topics`
*   `questions`
*   `results`
*   `testsessions`

### How does the code shape the data?
Inside `src/models/index.ts`, we've defined **Mongoose Schemas**. These act as blueprints that ensure all documents have the correct properties (like `matric_no`, `total_score`, `password`, etc.) before they get saved.

## 3. Viewing Your Data Online

To inspect, edit, or manually delete documents (collections) inside your database:
1. Go to **[MongoDB Atlas](https://cloud.mongodb.com/)** and log in to your account.
2. Navigate to your **Cluster0** and click the **"Browse Collections"** button.
3. You will see a database named `premedtestportal`. Inside, you'll see all of your synced collections.
4. You can edit documents directly via the UI in MongoDB Atlas.

## 4. Resetting Your Local Database

If you wish to nuke the database or wipe it clean while testing via the developer portal, you can now use the `Nuke Database` action in your Dev Dashboard (if you supply the developer password, which is `20252026`). 
Alternatively, the easiest way to delete everything is to just drop the collections directly from the **Browse Collections** UI internally on MongoDB Atlas.

## Summary of Changes Made
*   ✅ Uninstalled `firebase` and `firebase-admin`.
*   ✅ Completely removed internal references to Firebase SDKs.
*   ✅ Replaced Firebase Firestore queries with clean `mongoose` ORM calls.
*   ✅ Created `src/db.ts` to manage the connection.
*   ✅ Created `src/models/index.ts` to host your database schemas.
