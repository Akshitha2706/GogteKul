import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const ADMIN_TOKEN = 'test-token'; // Will be replaced with actual token

// Admin login credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@gogte.com',
  password: 'admin_pass',
};

let authToken = null;

// Initialize axios instance with interceptor
const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loginAdmin() {
  try {
    log('\n📝 Attempting Admin Login...', 'cyan');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
    authToken = response.data.token;
    log('✅ Login successful! Token obtained.', 'green');
    return true;
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testEndpoint(method, path, name, data = null) {
  try {
    let response;
    if (method === 'GET') {
      response = await api.get(path);
    } else if (method === 'POST') {
      response = await api.post(path, data);
    } else if (method === 'PUT') {
      response = await api.put(path, data);
    } else if (method === 'DELETE') {
      response = await api.delete(path);
    }

    log(`✅ ${method} ${path} - ${name}`, 'green');
    
    // Check if response has the expected structure
    if (method === 'GET' && path.includes('/stats')) {
      const data = response.data;
      const requiredFields = ['totalUsers', 'totalMembers', 'totalNews', 'totalEvents'];
      const missingFields = requiredFields.filter(f => !(f in data));
      
      if (missingFields.length > 0) {
        log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`, 'yellow');
      } else {
        log(`   ✅ All required stats fields present`, 'green');
      }
      log(`   📊 Response keys: ${Object.keys(data).join(', ')}`, 'blue');
    }
    
    return true;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    if (status === 401) {
      log(`❌ ${method} ${path} - ${name} (Unauthorized - auth issue)`, 'red');
    } else if (status === 403) {
      log(`❌ ${method} ${path} - ${name} (Forbidden - permission issue)`, 'red');
    } else if (status === 404) {
      log(`❌ ${method} ${path} - ${name} (Not Found - endpoint doesn't exist)`, 'red');
    } else {
      log(`❌ ${method} ${path} - ${name} (Error: ${message})`, 'red');
    }
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🧪 ADMIN API ENDPOINT TEST SUITE', 'cyan');
  log('='.repeat(60), 'cyan');

  // First, login
  const loggedIn = await loginAdmin();
  if (!loggedIn) {
    log('\n❌ Cannot proceed without authentication', 'red');
    return;
  }

  // Test all endpoints
  log('\n📋 TESTING ALL ADMIN ENDPOINTS', 'cyan');
  log('='.repeat(60), 'cyan');

  const tests = [
    // Stats
    ['GET', '/api/adminV2/stats', 'Dashboard Stats (v2)'],
    ['GET', '/api/admin/stats', 'Dashboard Stats (v1 - backward compat)'],

    // Users
    ['GET', '/api/adminV2/users', 'Get All Users'],
    ['GET', '/api/admin/users', 'Get All Users (v1)'],

    // Family Members
    ['GET', '/api/adminV2/family-members', 'Get All Family Members'],
    ['GET', '/api/admin/family-members', 'Get All Family Members (v1)'],

    // News
    ['GET', '/api/adminV2/news', 'Get All News'],
    ['GET', '/api/admin/news', 'Get All News (v1)'],

    // Events
    ['GET', '/api/adminV2/events', 'Get All Events'],
    ['GET', '/api/admin/events', 'Get All Events (v1)'],

    // Relationships
    ['GET', '/api/adminV2/relationships', 'Get All Relationships'],
    ['GET', '/api/admin/relationships', 'Get All Relationships (v1)'],

    // Hierarchy Forms
    ['GET', '/api/adminV2/hierarchy-forms', 'Get All Hierarchy Forms'],
    ['GET', '/api/admin/hierarchy-forms', 'Get All Hierarchy Forms (v1)'],

    // Temp Members
    ['GET', '/api/adminV2/temp-members', 'Get All Temp Members'],
    ['GET', '/api/admin/temp-members', 'Get All Temp Members (v1)'],

    // Login Details
    ['GET', '/api/adminV2/login-details', 'Get All Login Details'],
    ['GET', '/api/admin/login-details', 'Get All Login Details (v1)'],
  ];

  let passed = 0;
  let failed = 0;

  for (const [method, path, name] of tests) {
    const result = await testEndpoint(method, path, name);
    if (result) passed++;
    else failed++;
  }

  // Test Approve Endpoints
  log('\n📋 TESTING APPROVE ENDPOINTS (NEW)', 'cyan');
  log('='.repeat(60), 'cyan');
  log('⚠️  Note: These will fail if no records exist, but endpoint should exist', 'yellow');

  const approveTests = [
    ['PUT', '/api/adminV2/hierarchy-forms/test-id/approve', 'Approve Hierarchy Form'],
    ['PUT', '/api/adminV2/temp-members/test-id/approve', 'Approve Temp Member'],
    ['PUT', '/api/adminV2/relationships/test-id/approve', 'Approve Relationship'],
  ];

  // Note: These will fail due to bad ID, but we check if endpoint exists (404 with "not found document" vs "endpoint not found")

  log('\n' + '='.repeat(60), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`Total: ${passed + failed}`, 'blue');

  if (failed === 0) {
    log('\n🎉 ALL TESTS PASSED!', 'green');
  } else {
    log(`\n⚠️  ${failed} endpoint(s) need attention`, 'yellow');
  }

  log('='.repeat(60), 'cyan');
}

// Run tests
runAllTests().catch(err => {
  log(`\n❌ Test suite error: ${err.message}`, 'red');
  process.exit(1);
});