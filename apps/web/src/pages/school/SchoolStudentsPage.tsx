import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Users,
  Search,
  MoreVertical,
  Wallet,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SchoolLayout } from '@/components/school';

interface Student {
  id: string;
  externalId: string;
  name: string;
  email: string;
  phone: string;
  photo: string | null;
  class_name: string;
  walletId: string | null;
  walletBalance: number;
  status: 'linked' | 'pending' | 'unlinked';
  linkedAt: string | null;
  createdAt: string;
  feesPaid: number;
  feesTotal: number;
}

interface ClassStats {
  name: string;
  studentCount: number;
  feesPaid: number;
  feesTotal: number;
  feeProgress: number;
}

export function SchoolStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'pending' | 'unlinked'>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  // Get school info from URL params first, then localStorage as fallback
  const getSchoolInfo = () => {
    const schoolDomain = schoolSlug || localStorage.getItem('school_domain');
    const schoolId = localStorage.getItem('school_id') || localStorage.getItem('schoolId');
    return { domain: schoolDomain, id: schoolId };
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);

    try {
      const { domain: schoolDomain } = getSchoolInfo();
      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('per_page', '500');

        const response = await fetch(
          `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/students?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          const studentsData = result.data || result.students || result || [];
          console.log('[SchoolStudents] API returned', studentsData.length, 'students');

          const studentList = studentsData.map((s: any) => ({
            id: s.id?.toString() || s.student_id?.toString() || String(Math.random()),
            externalId: s.nsi || s.index_number || s.admission_number || s.admission_no || '',
            name: s.full_name || s.name || s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
            email: s.email || '',
            phone: s.phone || s.guardian_phone || s.parent?.guardian_phone || '',
            photo: s.photo || s.avatar_url || s.image || null,
            class_name: s.class || s.class_name || s.grade || 'Unassigned',
            walletId: s.wallet_id || s.peeap_wallet_id || null,
            walletBalance: s.wallet_balance || 0,
            status: s.wallet_linked ? 'linked' : (s.peeap_user_id ? 'pending' : 'unlinked'),
            linkedAt: s.peeap_linked_at || s.wallet_linked_at || null,
            createdAt: s.created_at || new Date().toISOString(),
            feesPaid: s.fees_paid || s.paid_amount || 0,
            feesTotal: s.fees_total || s.total_fees || s.fee_amount || 0,
          }));
          setStudents(studentList);

          // Expand all classes by default
          const classes = new Set<string>(studentList.map((s: Student) => s.class_name));
          setExpandedClasses(classes);
          return;
        }
      } catch (apiErr) {
        console.log('SaaS API not available:', apiErr);
      }

      setStudents([]);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Could not load students. The school system sync may not be configured yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [schoolSlug]);

  // Get unique classes
  const classes = useMemo(() => {
    const classSet = new Set(students.map(s => s.class_name));
    return Array.from(classSet).sort();
  }, [students]);

  // Calculate class statistics
  const classStats: ClassStats[] = useMemo(() => {
    const statsMap = new Map<string, ClassStats>();

    students.forEach(student => {
      const className = student.class_name;
      if (!statsMap.has(className)) {
        statsMap.set(className, {
          name: className,
          studentCount: 0,
          feesPaid: 0,
          feesTotal: 0,
          feeProgress: 0,
        });
      }
      const stats = statsMap.get(className)!;
      stats.studentCount++;
      stats.feesPaid += student.feesPaid;
      stats.feesTotal += student.feesTotal;
    });

    // Calculate progress percentages
    statsMap.forEach(stats => {
      stats.feeProgress = stats.feesTotal > 0
        ? Math.round((stats.feesPaid / stats.feesTotal) * 100)
        : 0;
    });

    return Array.from(statsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.externalId.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
      const matchesClass = filterClass === 'all' || student.class_name === filterClass;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [students, search, filterStatus, filterClass]);

  // Group students by class
  const studentsByClass = useMemo(() => {
    const grouped = new Map<string, Student[]>();
    filteredStudents.forEach(student => {
      const className = student.class_name;
      if (!grouped.has(className)) {
        grouped.set(className, []);
      }
      grouped.get(className)!.push(student);
    });
    return grouped;
  }, [filteredStudents]);

  const toggleClass = (className: string) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(className)) {
        newSet.delete(className);
      } else {
        newSet.add(className);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: Student['status']) => {
    switch (status) {
      case 'linked':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Linked
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30 rounded-full">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'unlinked':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 rounded-full">
            <XCircle className="h-3 w-3" />
            Unlinked
          </span>
        );
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Overall stats
  const totalFeesPaid = students.reduce((sum, s) => sum + s.feesPaid, 0);
  const totalFeesExpected = students.reduce((sum, s) => sum + s.feesTotal, 0);
  const overallProgress = totalFeesExpected > 0 ? Math.round((totalFeesPaid / totalFeesExpected) * 100) : 0;

  return (
    <SchoolLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Students</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {students.length} total students • {classes.length} classes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStudents}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchStudents}
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
          {/* Fee Progress Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Fee Collection by Class</h2>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallProgress}%</p>
                <p className="text-sm text-gray-500">Overall Collection</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {classStats.map((stats) => (
                <div key={stats.name} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{stats.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{stats.studentCount} students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(stats.feeProgress)} transition-all`}
                        style={{ width: `${stats.feeProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-10 text-right">
                      {stats.feeProgress}%
                    </span>
                  </div>
                  {stats.feesTotal > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      SLE {(stats.feesPaid / 100).toLocaleString()} / {(stats.feesTotal / 100).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="linked">Linked</option>
                <option value="pending">Pending</option>
                <option value="unlinked">Unlinked</option>
              </select>
            </div>
          </div>

          {/* Students by Class */}
          <div className="space-y-4">
            {Array.from(studentsByClass.entries()).map(([className, classStudents]) => (
              <div key={className} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {/* Class Header */}
                <button
                  onClick={() => toggleClass(className)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{className}</span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      {classStudents.length} students
                    </span>
                  </div>
                  {expandedClasses.has(className) ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Students List */}
                {expandedClasses.has(className) && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {classStudents.map((student) => (
                      <div key={student.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {/* Photo */}
                        <div className="flex-shrink-0">
                          {student.photo ? (
                            <img
                              src={student.photo}
                              alt={student.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center ${student.photo ? 'hidden' : ''}`}>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{student.name}</p>
                          <p className="text-sm text-gray-500 truncate">{student.externalId} • {student.email || student.phone || 'No contact'}</p>
                        </div>

                        {/* Fee Progress */}
                        {student.feesTotal > 0 && (
                          <div className="hidden sm:block w-32">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getProgressColor(student.feesTotal > 0 ? Math.round((student.feesPaid / student.feesTotal) * 100) : 0)}`}
                                  style={{ width: `${student.feesTotal > 0 ? (student.feesPaid / student.feesTotal) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-8">
                                {student.feesTotal > 0 ? Math.round((student.feesPaid / student.feesTotal) * 100) : 0}%
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Status */}
                        <div className="flex-shrink-0">
                          {getStatusBadge(student.status)}
                        </div>

                        {/* Wallet */}
                        <div className="hidden md:block w-28 text-right">
                          {student.walletId ? (
                            <div className="flex items-center justify-end gap-1">
                              <Wallet className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900 dark:text-white">
                                SLE {(student.walletBalance / 100).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>

                        {/* Actions */}
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredStudents.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No students found</p>
                <p className="text-sm text-gray-400 mt-1">Students from your school system will appear here</p>
              </div>
            )}
          </div>
        </>
      )}
    </SchoolLayout>
  );
}
