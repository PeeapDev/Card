/**
 * Pages Management Page
 *
 * Admin page to:
 * - View all pages
 * - Create new pages
 * - Edit existing pages with GrapesJS
 * - Delete pages
 * - Publish/unpublish pages
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Loader2,
  FileText,
  Globe,
  Calendar,
  MoreVertical,
  Copy,
  ExternalLink,
  Layout,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Page {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  page_type: string;
  is_homepage: boolean;
  show_in_nav: boolean;
  created_at: string;
  updated_at: string;
}

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  html: string;
  css: string;
  components: any;
  styles: any;
}

export function PagesManagementPage() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<Page | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New page form state
  const [newPage, setNewPage] = useState({
    title: '',
    slug: '',
    description: '',
    page_type: 'page',
    template_id: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPages();
    fetchTemplates();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPages(data || []);
    } catch (err: any) {
      console.error('Error fetching pages:', err);
      setError('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('page_templates')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (fetchError) throw fetchError;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCreatePage = async () => {
    if (!newPage.title || !newPage.slug) {
      setError('Title and slug are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Get template content if selected
      let templateContent = { html: '', css: '', components: null, styles: null };
      if (newPage.template_id) {
        const template = templates.find(t => t.id === newPage.template_id);
        if (template) {
          templateContent = {
            html: template.html || '',
            css: template.css || '',
            components: template.components,
            styles: template.styles,
          };
        }
      }

      const { data, error: insertError } = await supabase
        .from('pages')
        .insert({
          title: newPage.title,
          slug: newPage.slug,
          description: newPage.description,
          page_type: newPage.page_type,
          status: 'draft',
          html: templateContent.html,
          css: templateContent.css,
          components: templateContent.components,
          styles: templateContent.styles,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('A page with this slug already exists');
        }
        throw insertError;
      }

      setSuccess('Page created successfully!');
      setShowCreateModal(false);
      setNewPage({ title: '', slug: '', description: '', page_type: 'page', template_id: '' });

      // Navigate to editor
      if (data) {
        navigate(`/admin/pages/${data.id}/edit`);
      }
    } catch (err: any) {
      console.error('Error creating page:', err);
      setError(err.message || 'Failed to create page');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePage = async (page: Page) => {
    try {
      const { error: deleteError } = await supabase
        .from('pages')
        .delete()
        .eq('id', page.id);

      if (deleteError) throw deleteError;

      setPages(pages.filter(p => p.id !== page.id));
      setShowDeleteModal(null);
      setSuccess('Page deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting page:', err);
      setError('Failed to delete page');
    }
  };

  const handleToggleStatus = async (page: Page) => {
    const newStatus = page.status === 'published' ? 'draft' : 'published';

    try {
      const { error: updateError } = await supabase
        .from('pages')
        .update({
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : null,
        })
        .eq('id', page.id);

      if (updateError) throw updateError;

      setPages(pages.map(p => p.id === page.id ? { ...p, status: newStatus } : p));
      setSuccess(`Page ${newStatus === 'published' ? 'published' : 'unpublished'} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating page status:', err);
      setError('Failed to update page status');
    }
  };

  const handleDuplicate = async (page: Page) => {
    try {
      // Fetch the full page data
      const { data: fullPage, error: fetchError } = await supabase
        .from('pages')
        .select('*')
        .eq('id', page.id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate
      const { data, error: insertError } = await supabase
        .from('pages')
        .insert({
          ...fullPage,
          id: undefined,
          title: `${fullPage.title} (Copy)`,
          slug: `${fullPage.slug}-copy-${Date.now()}`,
          status: 'draft',
          is_homepage: false,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      fetchPages();
      setSuccess('Page duplicated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error duplicating page:', err);
      setError('Failed to duplicate page');
    }
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          page.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Published</span>;
      case 'draft':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Draft</span>;
      case 'archived':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Archived</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pages</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage your website pages with the visual page builder
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Create Page
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-700 hover:text-red-800">&times;</button>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </Card>

        {/* Pages List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredPages.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No pages found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No pages match your filters'
                : 'Get started by creating your first page'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                Create Your First Page
              </button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPages.map((page) => (
              <Card key={page.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                      <Layout className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{page.title}</h3>
                        {page.is_homepage && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">Home</span>
                        )}
                        {getStatusBadge(page.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          /{page.slug}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(page.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {page.status === 'published' && (
                      <a
                        href={`/p/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="View Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => navigate(`/admin/pages/${page.id}/edit`)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Edit Page"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(page)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title={page.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      {page.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDuplicate(page)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(page)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Page</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page Title *</label>
                <input
                  type="text"
                  value={newPage.title}
                  onChange={(e) => {
                    setNewPage({
                      ...newPage,
                      title: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  placeholder="About Us"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Slug *</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-500">/p/</span>
                  <input
                    type="text"
                    value={newPage.slug}
                    onChange={(e) => setNewPage({ ...newPage, slug: generateSlug(e.target.value) })}
                    placeholder="about-us"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newPage.description}
                  onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
                  placeholder="Brief description of this page"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page Type</label>
                <select
                  value={newPage.page_type}
                  onChange={(e) => setNewPage({ ...newPage, page_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="page">Standard Page</option>
                  <option value="landing">Landing Page</option>
                  <option value="legal">Legal Page</option>
                  <option value="blog">Blog Post</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start From Template</label>
                <select
                  value={newPage.template_id}
                  onChange={(e) => setNewPage({ ...newPage, template_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Blank Page</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPage({ title: '', slug: '', description: '', page_type: 'page', template_id: '' });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePage}
                disabled={creating || !newPage.title || !newPage.slug}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Delete Page</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete "{showDeleteModal.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePage(showDeleteModal)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
