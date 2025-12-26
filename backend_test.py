#!/usr/bin/env python3
"""
HR Nexus Backend API Testing Suite
Tests all API endpoints for the HR management system
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class HRNexusAPITester:
    def __init__(self, base_url="https://staffportal-29.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_users = {}  # Store created test users

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
            self.failed_tests.append({"test": name, "error": details})

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test basic API health"""
        success, response, status = self.make_request('GET', '')
        self.log_test("API Health Check", success and "HR Nexus API" in str(response))
        return success

    def test_user_registration(self):
        """Test user registration for all roles"""
        test_cases = [
            {
                "role": "intern",
                "email": f"intern_{uuid.uuid4().hex[:8]}@test.com",
                "data": {
                    "email": "",
                    "password": "TestPass123!",
                    "full_name": "Test Intern",
                    "phone": "+91 9876543210",
                    "gender": "male",
                    "date_of_birth": "2000-01-01",
                    "address": "Test Address, Mumbai",
                    "preferred_language": "english",
                    "role": "intern",
                    "intern_fields": {
                        "institution": "Test University",
                        "current_year": "3rd Year",
                        "major": "Computer Science",
                        "internship_start": "2024-01-01",
                        "internship_end": "2024-06-30",
                        "portfolio_url": "https://testportfolio.com",
                        "area_of_interest": "Web Development"
                    }
                }
            },
            {
                "role": "employee",
                "email": f"employee_{uuid.uuid4().hex[:8]}@test.com",
                "data": {
                    "email": "",
                    "password": "TestPass123!",
                    "full_name": "Test Employee",
                    "phone": "+91 9876543211",
                    "gender": "female",
                    "date_of_birth": "1990-01-01",
                    "address": "Test Address, Delhi",
                    "preferred_language": "english",
                    "role": "employee",
                    "employee_fields": {
                        "department": "Engineering",
                        "designation": "Software Engineer",
                        "joining_date": "2024-01-01",
                        "reporting_manager": "Test Manager",
                        "skills": ["Python", "React", "MongoDB"],
                        "government_id": "ABCDE1234F",
                        "bank_account": "1234567890",
                        "bank_ifsc": "HDFC0001234"
                    }
                }
            },
            {
                "role": "hr_manager",
                "email": f"hr_{uuid.uuid4().hex[:8]}@test.com",
                "data": {
                    "email": "",
                    "password": "TestPass123!",
                    "full_name": "Test HR Manager",
                    "phone": "+91 9876543212",
                    "gender": "male",
                    "date_of_birth": "1985-01-01",
                    "address": "Test Address, Bangalore",
                    "preferred_language": "english",
                    "role": "hr_manager",
                    "hr_manager_fields": {
                        "access_level": "admin",
                        "departments_overseen": ["Engineering", "Product"],
                        "approval_permissions": True,
                        "work_experience": "10 years in HR",
                        "certifications": ["SHRM-CP", "PHR"],
                        "office_location": "Bangalore HQ",
                        "emergency_contact": "+91 9876543213"
                    }
                }
            }
        ]

        for test_case in test_cases:
            test_case["data"]["email"] = test_case["email"]
            success, response, status = self.make_request('POST', 'auth/register', test_case["data"], 200)
            
            if success and "access_token" in response:
                self.test_users[test_case["role"]] = {
                    "email": test_case["email"],
                    "password": test_case["data"]["password"],
                    "token": response["access_token"],
                    "user": response["user"]
                }
                self.log_test(f"User Registration - {test_case['role'].title()}", True)
            else:
                self.log_test(f"User Registration - {test_case['role'].title()}", False, f"Status: {status}, Response: {response}")

    def test_user_login(self):
        """Test user login"""
        for role, user_data in self.test_users.items():
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            success, response, status = self.make_request('POST', 'auth/login', login_data, 200)
            
            if success and "access_token" in response:
                # Set token for the first successful login (we'll use this for subsequent tests)
                if not self.token:
                    self.token = response["access_token"]
                    self.user_id = response["user"]["id"]
                self.log_test(f"User Login - {role.title()}", True)
            else:
                self.log_test(f"User Login - {role.title()}", False, f"Status: {status}, Response: {response}")

    def test_auth_me(self):
        """Test get current user"""
        success, response, status = self.make_request('GET', 'auth/me')
        self.log_test("Get Current User", success and "email" in response)

    def test_attendance_flow(self):
        """Test attendance check-in/check-out flow"""
        # Test check-in
        success, response, status = self.make_request('POST', 'attendance/check-in', expected_status=200)
        self.log_test("Attendance Check-in", success)

        # Test today's attendance
        success, response, status = self.make_request('GET', 'attendance/today')
        self.log_test("Get Today's Attendance", success and "date" in response)

        # Test check-out
        success, response, status = self.make_request('POST', 'attendance/check-out', expected_status=200)
        self.log_test("Attendance Check-out", success)

        # Test attendance records
        success, response, status = self.make_request('GET', 'attendance/my-records')
        self.log_test("Get Attendance Records", success and isinstance(response, list))

    def test_leave_management(self):
        """Test leave application and management"""
        # Apply for leave
        leave_data = {
            "start_date": "2024-12-25",
            "end_date": "2024-12-26",
            "reason": "Test leave request",
            "leave_type": "casual"
        }
        success, response, status = self.make_request('POST', 'leave/apply', leave_data, 200)
        self.log_test("Apply Leave", success)

        # Get my leave requests
        success, response, status = self.make_request('GET', 'leave/my-requests')
        self.log_test("Get My Leave Requests", success and isinstance(response, list))

    def test_performance_goals(self):
        """Test performance goals management"""
        # Create a goal
        goal_data = {
            "title": "Test Goal",
            "description": "This is a test performance goal",
            "target_date": "2024-12-31"
        }
        success, response, status = self.make_request('POST', 'performance/goals', goal_data, 200)
        goal_id = response.get("id") if success else None
        self.log_test("Create Performance Goal", success)

        # Get my goals
        success, response, status = self.make_request('GET', 'performance/my-goals')
        self.log_test("Get My Goals", success and isinstance(response, list))

        # Update goal progress
        if goal_id:
            update_data = {"progress": 50, "status": "in_progress"}
            success, response, status = self.make_request('PUT', f'performance/goals/{goal_id}', update_data)
            self.log_test("Update Goal Progress", success)

    def test_announcements(self):
        """Test announcements"""
        # Get announcements
        success, response, status = self.make_request('GET', 'announcements')
        self.log_test("Get Announcements", success and isinstance(response, list))

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        # Get user dashboard stats
        success, response, status = self.make_request('GET', 'dashboard/stats')
        self.log_test("Get Dashboard Stats", success and "attendance" in response)

    def test_onboarding(self):
        """Test onboarding checklist"""
        # Get onboarding checklist
        success, response, status = self.make_request('GET', 'onboarding/checklist')
        self.log_test("Get Onboarding Checklist", success)

    def test_payroll(self):
        """Test payroll records"""
        # Get my payroll records
        success, response, status = self.make_request('GET', 'payroll/my-records')
        self.log_test("Get Payroll Records", success and isinstance(response, list))

    def test_tasks(self):
        """Test task management"""
        # Get my tasks
        success, response, status = self.make_request('GET', 'tasks/my-tasks')
        self.log_test("Get My Tasks", success and isinstance(response, list))

    def test_hr_manager_features(self):
        """Test HR manager specific features"""
        # Switch to HR manager token if available
        if "hr_manager" in self.test_users:
            hr_token = self.test_users["hr_manager"]["token"]
            original_token = self.token
            self.token = hr_token

            # Test HR dashboard stats
            success, response, status = self.make_request('GET', 'dashboard/hr-stats')
            self.log_test("Get HR Dashboard Stats", success and "total_employees" in response)

            # Test get all users
            success, response, status = self.make_request('GET', 'users')
            self.log_test("Get All Users (HR)", success and isinstance(response, list))

            # Test pending leaves
            success, response, status = self.make_request('GET', 'leave/pending')
            self.log_test("Get Pending Leaves (HR)", success and isinstance(response, list))

            # Test all attendance
            success, response, status = self.make_request('GET', 'attendance/all')
            self.log_test("Get All Attendance (HR)", success and isinstance(response, list))

            # Restore original token
            self.token = original_token

    def test_predefined_users_login(self):
        """Test login with predefined test users"""
        predefined_users = [
            {"email": "hr@test.com", "password": "password123", "role": "hr_manager"},
            {"email": "employee1@test.com", "password": "password123", "role": "employee"},
            {"email": "intern1@test.com", "password": "password123", "role": "intern"}
        ]
        
        self.predefined_tokens = {}
        
        for user in predefined_users:
            login_data = {"email": user["email"], "password": user["password"]}
            success, response, status = self.make_request('POST', 'auth/login', login_data, 200)
            
            if success and "access_token" in response:
                self.predefined_tokens[user["role"]] = {
                    "token": response["access_token"],
                    "user": response["user"]
                }
                self.log_test(f"Predefined User Login - {user['role'].title()}", True)
            else:
                self.log_test(f"Predefined User Login - {user['role'].title()}", False, f"Status: {status}, Response: {response}")

    def test_hr_onboarding_management_apis(self):
        """Test HR Onboarding Management APIs"""
        if "hr_manager" not in self.predefined_tokens:
            self.log_test("HR Onboarding APIs", False, "HR Manager token not available")
            return
            
        hr_token = self.predefined_tokens["hr_manager"]["token"]
        original_token = self.token
        self.token = hr_token
        
        # Test GET /api/onboarding/all-users (HR only)
        success, response, status = self.make_request('GET', 'onboarding/all-users')
        self.log_test("GET /api/onboarding/all-users", success and isinstance(response, list))
        
        # Get a user ID for further testing
        user_id = None
        if success and response:
            for user in response:
                if user.get("role") in ["intern", "employee"]:
                    user_id = user.get("id")
                    break
        
        if user_id:
            # Test GET /api/onboarding/user/{user_id}
            success, response, status = self.make_request('GET', f'onboarding/user/{user_id}')
            self.log_test("GET /api/onboarding/user/{user_id}", success and "user" in response and "onboarding" in response)
            
            # Test PUT /api/onboarding/user/{user_id}/item/{item_id} - mark checklist item complete
            if success and response.get("onboarding") and response["onboarding"].get("items"):
                item_id = response["onboarding"]["items"][0].get("id")
                if item_id:
                    update_data = {"completed": True}
                    success, response, status = self.make_request('PUT', f'onboarding/user/{user_id}/item/{item_id}', update_data)
                    self.log_test("PUT /api/onboarding/user/{user_id}/item/{item_id}", success)
            
            # Test PUT /api/onboarding/user/{user_id}/complete-all
            success, response, status = self.make_request('PUT', f'onboarding/user/{user_id}/complete-all', {})
            self.log_test("PUT /api/onboarding/user/{user_id}/complete-all", success)
        
        self.token = original_token

    def test_mentorship_assignment_apis(self):
        """Test Mentorship Assignment APIs"""
        if "hr_manager" not in self.predefined_tokens:
            self.log_test("Mentorship APIs", False, "HR Manager token not available")
            return
            
        hr_token = self.predefined_tokens["hr_manager"]["token"]
        original_token = self.token
        self.token = hr_token
        
        # Test GET /api/mentorship/assignments
        success, response, status = self.make_request('GET', 'mentorship/assignments')
        self.log_test("GET /api/mentorship/assignments", success and "employees" in response)
        
        # Test GET /api/mentorship/unassigned-interns
        success, response, status = self.make_request('GET', 'mentorship/unassigned-interns')
        self.log_test("GET /api/mentorship/unassigned-interns", success and isinstance(response, list))
        
        # Get employee and intern IDs for assignment test
        employees_response = self.make_request('GET', 'users/employees')
        interns_response = self.make_request('GET', 'mentorship/unassigned-interns')
        
        employee_id = None
        intern_id = None
        
        if employees_response[0] and employees_response[1]:
            employees = employees_response[1]
            if employees:
                employee_id = employees[0].get("id")
        
        if interns_response[0] and interns_response[1]:
            interns = interns_response[1]
            if interns:
                intern_id = interns[0].get("id")
        
        if employee_id:
            # Test PUT /api/mentorship/appoint-mentor/{employee_id}
            success, response, status = self.make_request('PUT', f'mentorship/appoint-mentor/{employee_id}', {})
            self.log_test("PUT /api/mentorship/appoint-mentor/{employee_id}", success)
            
            if intern_id:
                # Test POST /api/mentorship/assign
                assign_data = {"employee_id": employee_id, "intern_id": intern_id}
                success, response, status = self.make_request('POST', 'mentorship/assign', assign_data)
                self.log_test("POST /api/mentorship/assign", success)
        
        self.token = original_token

    def test_document_apis(self):
        """Test Document APIs"""
        if "intern" not in self.predefined_tokens:
            self.log_test("Document APIs", False, "Intern token not available")
            return
            
        intern_token = self.predefined_tokens["intern"]["token"]
        original_token = self.token
        self.token = intern_token
        
        # Test POST /api/documents/upload
        upload_data = {
            "type": "resume",
            "name": "test_resume.pdf",
            "data": "data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSA4IFRmCjEwIDcwIFRkCihUZXN0IFJlc3VtZSBEb2N1bWVudCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago="
        }
        success, response, status = self.make_request('POST', 'documents/upload', upload_data)
        self.log_test("POST /api/documents/upload", success)
        
        # Test GET /api/documents/my-documents
        success, response, status = self.make_request('GET', 'documents/my-documents')
        self.log_test("GET /api/documents/my-documents", success and isinstance(response, list))
        
        # Test GET /api/documents/offer-letter/download
        success, response, status = self.make_request('GET', 'documents/offer-letter/download')
        self.log_test("GET /api/documents/offer-letter/download", success or status == 200)
        
        self.token = original_token

    def test_role_based_access_control(self):
        """Test Role-Based Access Control"""
        if "intern" not in self.predefined_tokens or "hr_manager" not in self.predefined_tokens:
            self.log_test("RBAC Tests", False, "Required tokens not available")
            return
            
        intern_token = self.predefined_tokens["intern"]["token"]
        original_token = self.token
        
        # Test intern trying to access HR-only endpoints (should get 403)
        self.token = intern_token
        
        # Intern should NOT be able to access HR onboarding management
        success, response, status = self.make_request('GET', 'onboarding/all-users', expected_status=403)
        self.log_test("RBAC: Intern blocked from HR onboarding endpoint", success or status == 403)
        
        # Intern should NOT be able to access HR dashboard stats
        success, response, status = self.make_request('GET', 'dashboard/hr-stats', expected_status=403)
        self.log_test("RBAC: Intern blocked from HR dashboard", success or status == 403)
        
        # Intern should NOT be able to modify onboarding checklist
        success, response, status = self.make_request('PUT', 'onboarding/user/test-id/item/1', {"completed": True}, expected_status=403)
        self.log_test("RBAC: Intern blocked from modifying onboarding", success or status == 403)
        
        self.token = original_token

    def test_employee_mentorship_access(self):
        """Test Employee access to mentorship features"""
        if "employee" not in self.predefined_tokens:
            self.log_test("Employee Mentorship Access", False, "Employee token not available")
            return
            
        employee_token = self.predefined_tokens["employee"]["token"]
        original_token = self.token
        self.token = employee_token
        
        # Test GET /api/mentorship/assignments (employee should see their assigned interns)
        success, response, status = self.make_request('GET', 'mentorship/assignments')
        self.log_test("Employee: GET /api/mentorship/assignments", success and ("interns" in response or "is_mentor" in response))
        
        self.token = original_token

    def test_intern_read_only_onboarding(self):
        """Test Intern read-only access to onboarding"""
        if "intern" not in self.predefined_tokens:
            self.log_test("Intern Onboarding Access", False, "Intern token not available")
            return
            
        intern_token = self.predefined_tokens["intern"]["token"]
        original_token = self.token
        self.token = intern_token
        
        # Test GET /api/onboarding/checklist (intern should be able to read their own)
        success, response, status = self.make_request('GET', 'onboarding/checklist')
        self.log_test("Intern: GET /api/onboarding/checklist", success)
        
        self.token = original_token

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting HR Nexus Backend API Tests...")
        print(f"📍 Testing API at: {self.base_url}")
        print("=" * 60)

        # Test basic connectivity
        if not self.test_health_check():
            print("❌ API is not accessible. Stopping tests.")
            return False

        # Test predefined users login first
        print("\n🔐 Testing Predefined User Login...")
        self.test_predefined_users_login()

        # Test user management
        print("\n📝 Testing User Management...")
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me()

        if not self.token:
            print("❌ No valid authentication token. Cannot proceed with authenticated tests.")
            return False

        # Test HR Nexus specific features (HIGH PRIORITY)
        print("\n🎯 Testing HR Onboarding Management APIs...")
        self.test_hr_onboarding_management_apis()
        
        print("\n👥 Testing Mentorship Assignment APIs...")
        self.test_mentorship_assignment_apis()
        
        print("\n📄 Testing Document APIs...")
        self.test_document_apis()
        
        print("\n🔒 Testing Role-Based Access Control...")
        self.test_role_based_access_control()
        
        print("\n👨‍💼 Testing Employee Mentorship Access...")
        self.test_employee_mentorship_access()
        
        print("\n👨‍🎓 Testing Intern Read-Only Onboarding...")
        self.test_intern_read_only_onboarding()

        # Test core features
        print("\n⏰ Testing Attendance Management...")
        self.test_attendance_flow()

        print("\n🏖️ Testing Leave Management...")
        self.test_leave_management()

        print("\n🎯 Testing Performance Management...")
        self.test_performance_goals()

        print("\n📢 Testing Announcements...")
        self.test_announcements()

        print("\n📊 Testing Dashboard...")
        self.test_dashboard_stats()

        print("\n✅ Testing Onboarding...")
        self.test_onboarding()

        print("\n💰 Testing Payroll...")
        self.test_payroll()

        print("\n📋 Testing Tasks...")
        self.test_tasks()

        print("\n👥 Testing HR Manager Features...")
        self.test_hr_manager_features()

        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")

        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"  • {failure['test']}: {failure['error']}")

        print(f"\n🕒 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = HRNexusAPITester()
    
    try:
        success = tester.run_all_tests()
        all_passed = tester.print_summary()
        
        # Return appropriate exit code
        return 0 if all_passed else 1
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())