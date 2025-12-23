/**
 * Dynamic Page Renderer
 *
 * Renders pages created with the GrapesJS page builder
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';

interface Page {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  html: string | null;
  css: string | null;
  status: 'draft' | 'published' | 'archived';
  is_homepage: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_image: string | null;
  require_auth: boolean;
}

export function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPage();
    }
  }, [slug]);

  const fetchPage = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Page not found');
        } else {
          throw fetchError;
        }
        return;
      }

      setPage(data);
    } catch (err: any) {
      console.error('Error fetching page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist or has been removed.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        {page.meta_keywords && <meta name="keywords" content={page.meta_keywords} />}
        {page.og_image && <meta property="og:image" content={page.og_image} />}
        <meta property="og:title" content={page.meta_title || page.title} />
        {page.meta_description && <meta property="og:description" content={page.meta_description} />}
      </Helmet>

      {/* Page Content */}
      <div className="dynamic-page">
        {/* Inject CSS */}
        {page.css && (
          <style dangerouslySetInnerHTML={{ __html: page.css }} />
        )}

        {/* Render HTML */}
        {page.html && (
          <div dangerouslySetInnerHTML={{ __html: page.html }} />
        )}
      </div>
    </>
  );
}
