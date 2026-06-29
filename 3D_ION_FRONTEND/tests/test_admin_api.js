// Manual API test script — requires TEST_EMAIL and TEST_PASSWORD in root .env
// Run: node tests/test_admin_api.js (with env vars set in shell)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

async function testAdminEndpoint() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('Set TEST_EMAIL and TEST_PASSWORD before running this script.');
    process.exit(1);
  }

  console.log('Testing GET /admin/administrators');

  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_or_instagram: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!loginResponse.ok) {
    console.error('Login failed:', loginResponse.status);
    process.exit(1);
  }

  const loginJson = await loginResponse.json();
  const token = loginJson.access_token;

  const adminResponse = await fetch(`${API_URL}/admin/administrators`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('Admin response status:', adminResponse.status);
  if (adminResponse.ok) {
    const adminJson = await adminResponse.json();
    console.log('Admins count:', adminJson.admins?.length ?? 0);
  }
}

testAdminEndpoint().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
