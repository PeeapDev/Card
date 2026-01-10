import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Wallet,
  ArrowLeft,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface Student {
  id: string;
  externalId: string;
  name: string;
  email: string;
  phone: string;
  walletId: string | null;
  walletBalance: number;
  status: 'linked' | 'pending' | 'unlinked';
  linkedAt: string | null;
  createdAt: string;
}

export function SchoolStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'linked' | 'pending' | 'unlinked'>('all');

  useEffect(() => {
    // TODO: Fetch from API
    setStudents([
      {
        id: '1',
        externalId: 'STU-2024-001',
        name: 'John Doe',
        email: 'john@student.edu',
        phone: '+232 76 123 4567',
        walletId: 'wal_abc123',
        walletBalance: 5000000,
        status: 'linked',
        linkedAt: '2024-01-15T10:00:00Z',
        createdAt: '2024-01-10T10:00:00Z',
      },
      {
        id: '2',
        externalId: 'STU-2024-002',
        name: 'Jane Smith',
        email: 'jane@student.edu',
        phone: '+232 76 234 5678',
        walletId: 'wal_def456',
        walletBalance: 2500000,
        status: 'linked',
        linkedAt: '2024-01-14T10:00:00Z',
        createdAt: '2024-01-10T10:00:00Z',
      },
      {
        id: '3',
        externalId: 'STU-2024-003',
        name: 'Bob Wilson',
        email: 'bob@student.edu',
        phone: '+232 76 345 6789',
        walletId: null,
        walletBalance: 0,
        status: 'pending',
        linkedAt: null,
        createdAt: '2024-01-12T10:00:00Z',
      },
    ]);
    setLoading(false);
  }, []);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.externalId.toLowerCase().includes(search.toLowerCase()) ||
      student.email.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || student.status === filter;

    return matchesSearch && matchesFilter;
  });

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/school" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Students</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {students.length} total students
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Invite Students
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Students</option>
              <option value="linked">Linked</option>
              <option value="pending">Pending</option>
              <option value="unlinked">Unlinked</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Wallet Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Linked Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                      {student.externalId}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(student.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.walletId ? (
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">
                          SLE {(student.walletBalance / 100).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {student.linkedAt
                      ? new Date(student.linkedAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No students found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
