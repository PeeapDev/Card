import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SchoolLayout } from '@/components/school';
import {
  Users,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Briefcase,
  CheckCircle,
  XCircle,
  UserPlus,
  X,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  joinDate: string;
  salary: number;
  status: 'active' | 'inactive';
  avatar: string | null;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  isExistingUser: boolean;
}

export function SchoolStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);

  const [newStaff, setNewStaff] = useState({
    role: '',
    department: '',
    salary: '',
  });

  const departments = ['Administration', 'Teaching', 'Finance', 'IT', 'Maintenance', 'Security'];
  const roles = ['Teacher', 'Administrator', 'Accountant', 'IT Support', 'Security Guard', 'Cleaner', 'Principal', 'Vice Principal'];

  // Get school info from localStorage
  const getSchoolInfo = () => {
    const schoolDomain = localStorage.getItem('school_domain');
    const schoolId = localStorage.getItem('school_id') || localStorage.getItem('schoolId');
    return { domain: schoolDomain, id: schoolId };
  };

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);

    try {
      const { domain: schoolDomain, id: schoolId } = getSchoolInfo();
      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Try to fetch staff from SaaS sync API with school_id parameter
      try {
        const params = new URLSearchParams();
        if (schoolId) params.append('school_id', schoolId);
        params.append('page', '1');
        params.append('per_page', '500');

        const response = await fetch(
          `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/staff?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'X-School-Domain': schoolDomain,
              ...(schoolId ? { 'X-School-ID': schoolId } : {}),
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const staffList = (data.staff || data.data || data || []).map((s: any) => ({
            id: s.id,
            name: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            email: s.email || '',
            phone: s.phone || s.phone_number || '',
            role: s.role || s.position || s.job_title || 'Staff',
            department: s.department || 'General',
            joinDate: s.join_date || s.hired_date || s.created_at,
            salary: s.salary || s.monthly_salary || 0,
            status: s.status === 'inactive' ? 'inactive' : 'active',
            avatar: s.avatar_url || s.photo_url || null,
          }));
          setStaff(staffList);
          return;
        }
      } catch (apiErr) {
        console.log('SaaS API not available:', apiErr);
      }

      // If SaaS API fails, show empty state
      setStaff([]);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Could not load staff. The school system sync may not be configured yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Search users from Peeap system
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // TODO: Call API to search users
      // const response = await api.get(`/users/search?q=${query}`);

      // Simulated search results
      await new Promise(resolve => setTimeout(resolve, 500));
      setSearchResults([
        {
          id: 'user_001',
          name: 'Alice Thompson',
          email: 'alice@gmail.com',
          phone: '+232 76 123 4567',
          avatar: null,
          isExistingUser: true,
        },
        {
          id: 'user_002',
          name: 'Bob Anderson',
          email: 'bob@yahoo.com',
          phone: '+232 76 234 5678',
          avatar: null,
          isExistingUser: true,
        },
        {
          id: 'user_003',
          name: 'Carol White',
          email: 'carol@hotmail.com',
          phone: '+232 76 345 6789',
          avatar: null,
          isExistingUser: false,
        },
      ].filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()) ||
        u.phone.includes(query)
      ));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddStaff = async () => {
    if (!selectedUser || !newStaff.role || !newStaff.department) return;

    // TODO: Call API to add staff
    const newMember: StaffMember = {
      id: selectedUser.id,
      name: selectedUser.name,
      email: selectedUser.email,
      phone: selectedUser.phone,
      role: newStaff.role,
      department: newStaff.department,
      joinDate: new Date().toISOString().split('T')[0],
      salary: parseInt(newStaff.salary) || 0,
      status: 'active',
      avatar: selectedUser.avatar,
    };

    setStaff([...staff, newMember]);
    setShowAddModal(false);
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
    setNewStaff({ role: '', department: '', salary: '' });
  };

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      member.role.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment;

    return matchesSearch && matchesDepartment;
  });

  const totalSalary = staff.filter(s => s.status === 'active').reduce((sum, s) => sum + s.salary, 0);

  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  return (
    <SchoolLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {staff.length} staff members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStaff}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Add Staff
            </button>
          </div>
        </div>
      </div>

      <div>
        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={fetchStaff}
              className="ml-auto text-red-600 hover:text-red-700 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && !error && (
        <>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{staff.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {staff.filter(s => s.status === 'active').length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Departments</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {new Set(staff.map(s => s.department)).size}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Payroll</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              SLE {(totalSalary / 100).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((member) => (
            <div
              key={member.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                    <p className="text-sm text-gray-500">{member.role}</p>
                  </div>
                </div>
                {member.status === 'active' ? (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 rounded-full">
                    <XCircle className="h-3 w-3" />
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Briefcase className="h-4 w-4" />
                  {member.department}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4" />
                  {member.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4" />
                  {member.phone}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500">Salary</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    SLE {(member.salary / 100).toLocaleString()}
                  </p>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredStaff.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No staff members found</p>
              <p className="text-sm text-gray-400 mt-1">Staff from your school system will appear here</p>
            </div>
          )}
        </div>
        </>
        )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Staff Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Search for user */}
              {!selectedUser ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search User from Peeap
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email or phone..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => setSelectedUser(result)}
                          className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="font-medium text-gray-600 dark:text-gray-400">
                              {result.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{result.name}</p>
                            <p className="text-sm text-gray-500">{result.email}</p>
                          </div>
                          {result.isExistingUser && (
                            <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                              Peeap User
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 3 && searchResults.length === 0 && !searching && (
                    <p className="mt-2 text-sm text-gray-500 text-center py-4">
                      No users found. They can register on Peeap Pay first.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Selected User */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        {selectedUser.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{selectedUser.name}</p>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select role...</option>
                      {roles.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <select
                      value={newStaff.department}
                      onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select department...</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Salary */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monthly Salary (SLE)
                    </label>
                    <input
                      type="number"
                      value={newStaff.salary}
                      onChange={(e) => setNewStaff({ ...newStaff, salary: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter salary amount"
                    />
                  </div>
                </>
              )}
            </div>

            {selectedUser && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStaff}
                  disabled={!newStaff.role || !newStaff.department}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Staff Member
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </SchoolLayout>
  );
}
