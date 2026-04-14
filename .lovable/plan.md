

# Fix: Self-Service Photo Upload Failing for Unauthenticated Visitors

## Problem
The `visitor-photos` storage bucket only allows **authenticated** users to upload files. The self-service page runs without authentication (public route), so when a visitor takes a photo, the upload silently fails — the photo is never saved.

## Solution
Add a storage RLS policy that allows **anonymous (anon)** users to upload photos to the `visitor-photos` bucket.

## Changes

### 1. Database migration — Add anonymous upload policy
```sql
CREATE POLICY "Allow anonymous visitor photo uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'visitor-photos');
```

### 2. `src/pages/SelfService.tsx` — Add error feedback
- In `handlePhotoCapture`, if upload fails, show a more descriptive error so it's clear what went wrong (currently it says "Failed to upload photo" but the user may not notice before submitting).

## Files Changed
- New migration SQL — anonymous storage upload policy
- `src/pages/SelfService.tsx` — Better error handling for photo upload

