const assert = require('node:assert');

async function runTests() {
  console.log('--- Starting API Integration Tests ---');
  const BASE_URL = 'http://localhost:3000/api';

  // 1. Health check
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
  const healthData = await healthRes.json();
  console.log('✔ Health Check OK:', healthData.status);

  // 2. Register a new test user
  const randomSuffix = Math.floor(Math.random() * 10000);
  const testUser = {
    username: `tester_${randomSuffix}`,
    email: `tester_${randomSuffix}@test.com`,
    password: 'securepassword123',
    bio: 'Automated test user profile'
  };

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });
  assert.strictEqual(regRes.status, 201, 'Register should return 201');
  const regData = await regRes.json();
  assert(regData.token, 'Token should be returned on registration');
  console.log('✔ User Registration OK:', regData.user.username);

  // 3. Login with test user
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  assert.strictEqual(loginRes.status, 200, 'Login should return 200');
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✔ User Login OK, token received');

  // 4. Verify auth profile (/me)
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(meRes.status, 200, 'Me endpoint should return 200');
  const meData = await meRes.json();
  assert.strictEqual(meData.user.username, testUser.username);
  console.log('✔ Authenticated User Profile OK');

  // 5. Get initial posts feed
  const postsRes = await fetch(`${BASE_URL}/posts`);
  assert.strictEqual(postsRes.status, 200, 'Fetch posts should return 200');
  const postsData = await postsRes.json();
  assert(Array.isArray(postsData.posts), 'Posts should be an array');
  console.log(`✔ Fetch Posts OK (Found ${postsData.posts.length} posts)`);

  // 6. Create a new blog post
  const newPostPayload = {
    title: 'Automated Testing with Native SQLite',
    content: 'Writing automated tests gives immense confidence when shipping modern web software applications.',
    tags: ['Testing', 'NodeJS', 'Automation']
  };

  const createPostRes = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(newPostPayload)
  });
  assert.strictEqual(createPostRes.status, 201, 'Create post should return 201');
  const createdPostData = await createPostRes.json();
  const createdPost = createdPostData.post;
  assert.strictEqual(createdPost.title, newPostPayload.title);
  console.log('✔ Create Post OK, Post ID:', createdPost.id);

  // 7. Update blog post
  const updateRes = await fetch(`${BASE_URL}/posts/${createdPost.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'Automated Testing with Native SQLite (Updated)',
      tags: ['Testing', 'NodeJS', 'Updated']
    })
  });
  assert.strictEqual(updateRes.status, 200, 'Update post should return 200');
  const updatedData = await updateRes.json();
  assert.strictEqual(updatedData.post.title, 'Automated Testing with Native SQLite (Updated)');
  console.log('✔ Update Post OK');

  // 8. Add a comment to the post
  const commentPayload = { content: 'This is an insightful test comment on the article!' };
  const addCommentRes = await fetch(`${BASE_URL}/posts/${createdPost.id}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(commentPayload)
  });
  assert.strictEqual(addCommentRes.status, 201, 'Add comment should return 201');
  const commentData = await addCommentRes.json();
  const commentId = commentData.comment.id;
  console.log('✔ Add Comment OK, Comment ID:', commentId);

  // 9. Fetch comments for post
  const getCommentsRes = await fetch(`${BASE_URL}/posts/${createdPost.id}/comments`);
  assert.strictEqual(getCommentsRes.status, 200, 'Get comments should return 200');
  const commentsList = await getCommentsRes.json();
  assert.strictEqual(commentsList.comments.length, 1);
  console.log('✔ Fetch Comments OK');

  // 10. Toggle Like on post
  const likeRes = await fetch(`${BASE_URL}/posts/${createdPost.id}/like`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(likeRes.status, 200, 'Like toggle should return 200');
  const likeData = await likeRes.json();
  assert.strictEqual(likeData.liked, true, 'Post should be liked');
  assert.strictEqual(likeData.likes_count, 1, 'Likes count should be 1');
  console.log('✔ Like Post OK');

  // 11. Update Profile
  const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ bio: 'Updated engineer bio for testing' })
  });
  assert.strictEqual(profileRes.status, 200, 'Profile update should return 200');
  const profileData = await profileRes.json();
  assert.strictEqual(profileData.user.bio, 'Updated engineer bio for testing');
  console.log('✔ Profile Update OK');

  // 12. Delete comment
  const delCommentRes = await fetch(`${BASE_URL}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(delCommentRes.status, 200, 'Delete comment should return 200');
  console.log('✔ Delete Comment OK');

  // 13. Delete post
  const delPostRes = await fetch(`${BASE_URL}/posts/${createdPost.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(delPostRes.status, 200, 'Delete post should return 200');
  console.log('✔ Delete Post OK');

  console.log('==============================================');
  console.log('🎉 ALL BACKEND API TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('==============================================');
}

// Start server in-process if not already running
const server = require('../server/index');
const listener = server.listen(3000, async () => {
  try {
    await runTests();
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    listener.close();
  }
});
