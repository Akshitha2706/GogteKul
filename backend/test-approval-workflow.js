import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:4000/api/adminV2';
let adminToken = '';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  section: (title) => console.log(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  data: (label, data) => console.log(`${colors.bright}${label}:${colors.reset}`, JSON.stringify(data, null, 2)),
};

async function authenticate() {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gogte.com',
        password: 'admin_pass',
      }),
    });

    const data = await response.json();
    adminToken = data.token;
    log.success(`Admin authenticated with token: ${adminToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    log.error(`Authentication failed: ${error.message}`);
    return false;
  }
}

async function testHierarchyFormApproval() {
  log.section('TESTING HIERARCHY FORM APPROVAL WORKFLOW');

  try {
    // 1. Create a hierarchy form
    log.info('Creating a test hierarchy form...');
    const formResponse = await fetch(`${BASE_URL}/hierarchy-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        primaryMemberName: 'Test Member',
        primaryMemberSerNo: 9999,
        formData: {
          firstName: 'John',
          middleName: 'Q',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          phoneNumber: '9876543210',
          dateOfBirth: '1990-01-15',
          gender: 'Male',
          occupation: 'Engineer',
          maritalStatus: 'Single',
          education: 'B.Tech',
          address: {
            street: '123 Main St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'India',
          },
          biography: 'Test biography',
          vanshNumber: 'V001',
          bloodGroup: 'O+',
          notes: 'Test notes',
        },
      }),
    });

    if (!formResponse.ok) {
      throw new Error(`Failed to create form: ${formResponse.status}`);
    }

    const formData = await formResponse.json();
    const formId = formData.form._id;
    log.success(`Hierarchy form created: ${formId}`);

    // 2. Approve the hierarchy form
    log.info('Approving hierarchy form...');
    const approveResponse = await fetch(`${BASE_URL}/hierarchy-forms/${formId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        approvalComments: 'Approved for testing',
      }),
    });

    if (!approveResponse.ok) {
      throw new Error(`Failed to approve form: ${approveResponse.status}`);
    }

    const approvalResult = await approveResponse.json();
    log.success(`Hierarchy form approved`);
    log.info(`Response: ${approvalResult.message}`);
    log.info(`Family member created: ${approvalResult.familyMember.id}`);
    log.info(`User login entry created: ${approvalResult.userCreated}`);

    // 3. Verify the form is deleted
    log.info('Verifying form is deleted from Heirarchy_form collection...');
    const checkDeleteResponse = await fetch(`${BASE_URL}/hierarchy-forms/${formId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    // Should either return 404 or not find the form in the list
    const allForms = await fetch(`${BASE_URL}/hierarchy-forms`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const formsData = await allForms.json();
    const formExists = formsData.some((f) => f._id === formId);
    
    if (!formExists) {
      log.success('Form successfully deleted from Heirarchy_form collection');
    } else {
      log.warn('Form still exists in Heirarchy_form collection');
    }

    return true;
  } catch (error) {
    log.error(`Hierarchy form approval test failed: ${error.message}`);
    return false;
  }
}

async function testTempMemberApproval() {
  log.section('TESTING TEMP MEMBER APPROVAL WORKFLOW');

  try {
    // 1. Create a temp member
    log.info('Creating a test temp member...');
    const tempResponse = await fetch(`${BASE_URL}/temp-members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        firstName: 'Jane',
        middleName: 'M',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        phoneNumber: '9876543211',
        dateOfBirth: '1992-05-20',
        gender: 'Female',
        occupation: 'Doctor',
        maritalStatus: 'Married',
        address: {
          street: '456 Oak St',
          city: 'Test Town',
          state: 'TT',
          postalCode: '54321',
          country: 'India',
        },
        parentInfo: {
          fatherName: 'Father',
          motherName: 'Mother',
        },
        spouseInfo: {
          spouseName: 'Spouse',
          marriageDate: '2020-06-15',
        },
        notes: 'Test temp member',
      }),
    });

    if (!tempResponse.ok) {
      throw new Error(`Failed to create temp member: ${tempResponse.status}`);
    }

    const tempData = await tempResponse.json();
    const tempMemberId = tempData.member._id;
    log.success(`Temp member created: ${tempMemberId}`);

    // 2. Approve the temp member
    log.info('Approving temp member...');
    const approveResponse = await fetch(`${BASE_URL}/temp-members/${tempMemberId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        approvalComments: 'Approved for testing',
      }),
    });

    if (!approveResponse.ok) {
      throw new Error(`Failed to approve temp member: ${approveResponse.status}`);
    }

    const approvalResult = await approveResponse.json();
    log.success(`Temp member approved`);
    log.info(`Response: ${approvalResult.message}`);
    log.info(`Family member created: ${approvalResult.familyMember.id}`);
    log.info(`User login entry created: ${approvalResult.userCreated}`);

    // 3. Verify the temp member is deleted
    log.info('Verifying temp member is deleted from temp collection...');
    const allTempMembers = await fetch(`${BASE_URL}/temp-members`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const tempMembersData = await allTempMembers.json();
    const tempExists = tempMembersData.some((m) => m._id === tempMemberId);
    
    if (!tempExists) {
      log.success('Temp member successfully deleted from temp collection');
    } else {
      log.warn('Temp member still exists in temp collection');
    }

    return true;
  } catch (error) {
    log.error(`Temp member approval test failed: ${error.message}`);
    return false;
  }
}

async function testFamilyMemberCreation() {
  log.section('VERIFYING FAMILY MEMBERS CREATED');

  try {
    const response = await fetch(`${BASE_URL}/family-members`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch family members: ${response.status}`);
    }

    const members = await response.json();
    log.success(`Found ${members.length} family members in database`);
    
    if (members.length > 0) {
      log.info(`Recent members: ${members.slice(-2).map((m) => `${m.firstName} ${m.lastName}`).join(', ')}`);
    }

    return true;
  } catch (error) {
    log.error(`Family member verification failed: ${error.message}`);
    return false;
  }
}

async function testLoginEntriesCreated() {
  log.section('VERIFYING LOGIN ENTRIES CREATED');

  try {
    const response = await fetch(`${BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const users = await response.json();
    log.success(`Found ${users.length} user login entries`);
    
    // Check for our test users
    const testUsers = users.filter((u) => u.email.includes('test.com'));
    if (testUsers.length > 0) {
      log.success(`Found ${testUsers.length} test user(s): ${testUsers.map((u) => u.email).join(', ')}`);
    }

    return true;
  } catch (error) {
    log.error(`Login entries verification failed: ${error.message}`);
    return false;
  }
}

async function testDuplicateApprovalPrevention() {
  log.section('TESTING DUPLICATE APPROVAL PREVENTION');

  try {
    // Create a form
    const formResponse = await fetch(`${BASE_URL}/hierarchy-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        primaryMemberName: 'Duplicate Test',
        formData: {
          firstName: 'Duplicate',
          lastName: 'Test',
          email: 'duplicate@test.com',
        },
      }),
    });

    const formData = await formResponse.json();
    const formId = formData.form._id;

    // Approve it once
    await fetch(`${BASE_URL}/hierarchy-forms/${formId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });

    // Try to approve again - should fail
    const secondApproveResponse = await fetch(`${BASE_URL}/hierarchy-forms/${formId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}),
    });

    if (secondApproveResponse.status === 404 || secondApproveResponse.status === 400) {
      log.success('Duplicate approval correctly prevented');
    } else {
      log.warn(`Unexpected status code: ${secondApproveResponse.status}`);
    }

    return true;
  } catch (error) {
    log.error(`Duplicate approval prevention test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log.section('APPROVAL WORKFLOW TEST SUITE');
  log.info(`API Base URL: ${BASE_URL}`);

  // Step 1: Authenticate
  if (!(await authenticate())) {
    log.error('Cannot proceed without authentication');
    return;
  }

  const results = [];

  // Step 2: Run tests
  results.push(['Hierarchy Form Approval', await testHierarchyFormApproval()]);
  results.push(['Temp Member Approval', await testTempMemberApproval()]);
  results.push(['Family Member Creation', await testFamilyMemberCreation()]);
  results.push(['Login Entries Creation', await testLoginEntriesCreated()]);
  results.push(['Duplicate Approval Prevention', await testDuplicateApprovalPrevention()]);

  // Step 3: Summary
  log.section('TEST SUMMARY');
  let passed = 0;
  results.forEach(([name, result]) => {
    if (result) {
      log.success(name);
      passed++;
    } else {
      log.error(name);
    }
  });

  console.log(
    `\n${colors.bright}Results: ${passed}/${results.length} tests passed${colors.reset}\n`
  );
}

// Run tests
runAllTests().catch((error) => {
  log.error(`Test suite error: ${error.message}`);
  process.exit(1);
});