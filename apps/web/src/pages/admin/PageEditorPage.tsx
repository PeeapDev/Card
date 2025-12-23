/**
 * Page Editor Page
 *
 * Full-screen GrapesJS page builder for editing pages
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  FileText,
  Search,
} from 'lucide-react';
import { PageEditor } from '@/components/page-builder/PageEditor';
import { supabase } from '@/lib/supabase';

interface Page {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  html: string | null;
  css: string | null;
  components: any;
  styles: any;
  status: 'draft' | 'published' | 'archived';
  page_type: string;
  is_homepage: boolean;
  show_in_nav: boolean;
  nav_order: number;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image: string | null;
  require_auth: boolean;
}

export function PageEditorPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Current editor content (for saving)
  const [editorContent, setEditorContent] = useState<{
    html: string;
    css: string;
    components: any;
    styles: any;
  } | null>(null);

  useEffect(() => {
    if (pageId) {
      fetchPage();
    }
  }, [pageId]);

  const fetchPage = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (fetchError) throw fetchError;
      setPage(data);
    } catch (err: any) {
      console.error('Error fetching page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (data: { html: string; css: string; components: any; styles: any }) => {
    setEditorContent(data);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!page || !editorContent) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('pages')
        .update({
          html: editorContent.html,
          css: editorContent.css,
          components: editorContent.components,
          styles: editorContent.styles,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id);

      if (updateError) throw updateError;

      setSuccess('Page saved successfully!');
      setHasChanges(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving page:', err);
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!page) return;

    setSaving(true);
    setError(null);

    try {
      // Save content first if there are changes
      if (editorContent && hasChanges) {
        const { error: updateError } = await supabase
          .from('pages')
          .update({
            html: editorContent.html,
            css: editorContent.css,
            components: editorContent.components,
            styles: editorContent.styles,
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', page.id);

        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from('pages')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', page.id);

        if (updateError) throw updateError;
      }

      setPage({ ...page, status: 'published' });
      setSuccess('Page published successfully!');
      setHasChanges(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error publishing page:', err);
      setError('Failed to publish page');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsChange = async (settings: Partial<Page>) => {
    if (!page) return;

    try {
      const { error: updateError } = await supabase
        .from('pages')
        .update(settings)
        .eq('id', page.id);

      if (updateError) throw updateError;

      setPage({ ...page, ...settings });
      setSuccess('Settings saved!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Page Not Found</h2>
          <button
            onClick={() => navigate('/admin/pages')}
            className="text-indigo-400 hover:text-indigo-300"
          >
            Back to Pages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/pages')}
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-6 w-px bg-gray-600" />
          <div>
            <h1 className="text-white font-semibold">{page.title}</h1>
            <p className="text-gray-400 text-sm">/{page.slug}</p>
          </div>
          {hasChanges && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-900/50 text-yellow-300 rounded">
              Unsaved Changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {success && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{success}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {page.status === 'published' && (
            <a
              href={`/p/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg"
            >
              <Eye className="w-4 h-4" />
              Preview
            </a>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>

          <button
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {page.status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <PageEditor
          initialHtml={page.html || ''}
          initialCss={page.css || ''}
          initialComponents={page.components}
          initialStyles={page.styles}
          onChange={handleEditorChange}
        />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Page Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={page.title}
                  onChange={(e) => setPage({ ...page, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-500">/p/</span>
                  <input
                    type="text"
                    value={page.slug}
                    onChange={(e) => setPage({ ...page, slug: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={page.description || ''}
                  onChange={(e) => setPage({ ...page, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              {/* Display Options */}
              <div className="pt-4 border-t dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Display Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={page.is_homepage}
                      onChange={(e) => setPage({ ...page, is_homepage: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Set as Homepage</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={page.show_in_nav}
                      onChange={(e) => setPage({ ...page, show_in_nav: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Show in Navigation</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={page.require_auth}
                      onChange={(e) => setPage({ ...page, require_auth: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Require Login to View</span>
                  </label>
                </div>
              </div>

              {/* SEO */}
              <div className="pt-4 border-t dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  SEO Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Title</label>
                    <input
                      type="text"
                      value={page.meta_title || ''}
                      onChange={(e) => setPage({ ...page, meta_title: e.target.value })}
                      placeholder={page.title}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Description</label>
                    <textarea
                      rows={2}
                      value={page.meta_description || ''}
                      onChange={(e) => setPage({ ...page, meta_description: e.target.value })}
                      placeholder="Brief description for search engines"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OG Image URL</label>
                    <input
                      type="url"
                      value={page.og_image || ''}
                      onChange={(e) => setPage({ ...page, og_image: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleSettingsChange({
                    title: page.title,
                    slug: page.slug,
                    description: page.description,
                    is_homepage: page.is_homepage,
                    show_in_nav: page.show_in_nav,
                    require_auth: page.require_auth,
                    meta_title: page.meta_title,
                    meta_description: page.meta_description,
                    og_image: page.og_image,
                  });
                  setShowSettings(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
