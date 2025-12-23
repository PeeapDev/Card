import { useEffect, useRef, useState } from 'react';
import grapesjs, { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';

// Plugins
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import gjsBlocksBasic from 'grapesjs-blocks-basic';
import gjsPluginForms from 'grapesjs-plugin-forms';
// @ts-ignore - grapesjs-tabs has no type definitions
import gjsTabs from 'grapesjs-tabs';
import gjsCustomCode from 'grapesjs-custom-code';

interface PageEditorProps {
  initialHtml?: string;
  initialCss?: string;
  initialComponents?: any;
  initialStyles?: any;
  onSave?: (data: { html: string; css: string; components: any; styles: any }) => void;
  onChange?: (data: { html: string; css: string; components: any; styles: any }) => void;
  readOnly?: boolean;
}

export function PageEditor({
  initialHtml = '',
  initialCss = '',
  initialComponents,
  initialStyles,
  onSave,
  onChange,
  readOnly = false,
}: PageEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const gjsEditor = grapesjs.init({
      container: editorRef.current,
      height: '100%',
      width: 'auto',
      fromElement: false,
      storageManager: false,

      // Plugins
      plugins: [
        gjsPresetWebpage,
        gjsBlocksBasic,
        gjsPluginForms,
        gjsTabs,
        gjsCustomCode,
      ],
      pluginsOpts: {
        [gjsPresetWebpage as any]: {
          blocksBasicOpts: {
            blocks: ['column1', 'column2', 'column3', 'column3-7', 'text', 'link', 'image', 'video', 'map'],
            flexGrid: true,
          },
          navbarOpts: false,
          countdownOpts: false,
        },
        [gjsBlocksBasic as any]: {
          flexGrid: true,
        },
        [gjsPluginForms as any]: {
          blocks: ['form', 'input', 'textarea', 'select', 'button', 'label', 'checkbox', 'radio'],
        },
      },

      // Canvas settings
      canvas: {
        styles: [
          'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
        ],
      },

      // Device Manager
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Tablet', width: '768px', widthMedia: '992px' },
          { name: 'Mobile', width: '320px', widthMedia: '480px' },
        ],
      },

      // Style Manager sectors
      styleManager: {
        sectors: [
          {
            name: 'General',
            open: true,
            buildProps: ['float', 'display', 'position', 'top', 'right', 'left', 'bottom'],
          },
          {
            name: 'Dimension',
            open: false,
            buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
          },
          {
            name: 'Typography',
            open: false,
            buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-decoration', 'text-shadow'],
          },
          {
            name: 'Decorations',
            open: false,
            buildProps: ['background-color', 'background', 'border-radius', 'border', 'box-shadow'],
          },
          {
            name: 'Extra',
            open: false,
            buildProps: ['opacity', 'transition', 'transform'],
          },
        ],
      },

      // Block Manager Categories
      blockManager: {
        appendTo: '#blocks-container',
        blocks: [],
      },

      // Panels configuration
      panels: {
        defaults: [
          {
            id: 'panel-devices',
            el: '.panel__devices',
            buttons: [
              { id: 'device-desktop', label: '🖥️', command: 'set-device-desktop', active: true, togglable: false },
              { id: 'device-tablet', label: '📱', command: 'set-device-tablet', togglable: false },
              { id: 'device-mobile', label: '📱', command: 'set-device-mobile', togglable: false },
            ],
          },
          {
            id: 'panel-switcher',
            el: '.panel__switcher',
            buttons: [
              { id: 'show-layers', active: true, label: 'Layers', command: 'show-layers', togglable: false },
              { id: 'show-styles', label: 'Styles', command: 'show-styles', togglable: false },
              { id: 'show-traits', label: 'Traits', command: 'show-traits', togglable: false },
              { id: 'show-blocks', label: 'Blocks', command: 'show-blocks', togglable: false },
            ],
          },
        ],
      },
    });

    // Add custom blocks for common sections
    gjsEditor.BlockManager.add('hero-section', {
      label: 'Hero Section',
      category: 'Sections',
      content: `
        <section class="hero-section bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-20 px-4">
          <div class="max-w-4xl mx-auto text-center">
            <h1 class="text-5xl font-bold mb-6">Your Headline Here</h1>
            <p class="text-xl mb-8 opacity-90">Add your compelling description to capture visitors' attention</p>
            <a href="#" class="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">Get Started</a>
          </div>
        </section>
      `,
      attributes: { class: 'gjs-block-section' },
    });

    gjsEditor.BlockManager.add('features-grid', {
      label: 'Features Grid',
      category: 'Sections',
      content: `
        <section class="py-20 px-4 bg-gray-50">
          <div class="max-w-6xl mx-auto">
            <h2 class="text-3xl font-bold text-center mb-12">Our Features</h2>
            <div class="grid md:grid-cols-3 gap-8">
              <div class="bg-white p-6 rounded-xl shadow-sm">
                <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <span class="text-2xl">⚡</span>
                </div>
                <h3 class="text-xl font-semibold mb-3">Feature One</h3>
                <p class="text-gray-600">Description of your first feature goes here.</p>
              </div>
              <div class="bg-white p-6 rounded-xl shadow-sm">
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <span class="text-2xl">🎯</span>
                </div>
                <h3 class="text-xl font-semibold mb-3">Feature Two</h3>
                <p class="text-gray-600">Description of your second feature goes here.</p>
              </div>
              <div class="bg-white p-6 rounded-xl shadow-sm">
                <div class="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <span class="text-2xl">🚀</span>
                </div>
                <h3 class="text-xl font-semibold mb-3">Feature Three</h3>
                <p class="text-gray-600">Description of your third feature goes here.</p>
              </div>
            </div>
          </div>
        </section>
      `,
      attributes: { class: 'gjs-block-section' },
    });

    gjsEditor.BlockManager.add('cta-section', {
      label: 'Call to Action',
      category: 'Sections',
      content: `
        <section class="py-20 px-4 bg-indigo-600 text-white">
          <div class="max-w-4xl mx-auto text-center">
            <h2 class="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p class="text-xl opacity-90 mb-8">Join thousands of happy customers today.</p>
            <a href="#" class="inline-block bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">Start Free Trial</a>
          </div>
        </section>
      `,
      attributes: { class: 'gjs-block-section' },
    });

    gjsEditor.BlockManager.add('pricing-section', {
      label: 'Pricing Cards',
      category: 'Sections',
      content: `
        <section class="py-20 px-4">
          <div class="max-w-6xl mx-auto text-center">
            <h2 class="text-3xl font-bold mb-4">Simple Pricing</h2>
            <p class="text-gray-600 mb-12">Choose the plan that works for you</p>
            <div class="grid md:grid-cols-3 gap-8">
              <div class="bg-white border rounded-xl p-8">
                <h3 class="text-xl font-semibold mb-2">Starter</h3>
                <div class="text-4xl font-bold mb-6">$9<span class="text-lg font-normal text-gray-500">/mo</span></div>
                <ul class="text-left space-y-3 mb-8">
                  <li>✓ Feature 1</li>
                  <li>✓ Feature 2</li>
                </ul>
                <button class="w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold">Get Started</button>
              </div>
              <div class="bg-indigo-600 text-white rounded-xl p-8 transform scale-105">
                <h3 class="text-xl font-semibold mb-2">Pro</h3>
                <div class="text-4xl font-bold mb-6">$29<span class="text-lg font-normal opacity-80">/mo</span></div>
                <ul class="text-left space-y-3 mb-8">
                  <li>✓ Everything in Starter</li>
                  <li>✓ Feature 3</li>
                </ul>
                <button class="w-full py-3 bg-white text-indigo-600 rounded-lg font-semibold">Get Started</button>
              </div>
              <div class="bg-white border rounded-xl p-8">
                <h3 class="text-xl font-semibold mb-2">Enterprise</h3>
                <div class="text-4xl font-bold mb-6">Custom</div>
                <ul class="text-left space-y-3 mb-8">
                  <li>✓ Everything in Pro</li>
                  <li>✓ Custom Support</li>
                </ul>
                <button class="w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold">Contact Us</button>
              </div>
            </div>
          </div>
        </section>
      `,
      attributes: { class: 'gjs-block-section' },
    });

    gjsEditor.BlockManager.add('testimonials', {
      label: 'Testimonials',
      category: 'Sections',
      content: `
        <section class="py-20 px-4 bg-gray-50">
          <div class="max-w-6xl mx-auto">
            <h2 class="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
            <div class="grid md:grid-cols-2 gap-8">
              <div class="bg-white p-8 rounded-xl shadow-sm">
                <p class="text-gray-600 mb-6">"This product has completely transformed how we do business. Highly recommended!"</p>
                <div class="flex items-center">
                  <div class="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                  <div>
                    <p class="font-semibold">John Doe</p>
                    <p class="text-gray-500 text-sm">CEO, Company</p>
                  </div>
                </div>
              </div>
              <div class="bg-white p-8 rounded-xl shadow-sm">
                <p class="text-gray-600 mb-6">"Amazing service and support. The team goes above and beyond."</p>
                <div class="flex items-center">
                  <div class="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                  <div>
                    <p class="font-semibold">Jane Smith</p>
                    <p class="text-gray-500 text-sm">Manager, Business</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      `,
      attributes: { class: 'gjs-block-section' },
    });

    gjsEditor.BlockManager.add('footer', {
      label: 'Footer',
      category: 'Sections',
      content: `
        <footer class="bg-gray-900 text-white py-12 px-4">
          <div class="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
            <div>
              <h3 class="text-xl font-bold mb-4">Company</h3>
              <p class="text-gray-400">Your company description goes here.</p>
            </div>
            <div>
              <h4 class="font-semibold mb-4">Product</h4>
              <ul class="space-y-2 text-gray-400">
                <li><a href="#" class="hover:text-white">Features</a></li>
                <li><a href="#" class="hover:text-white">Pricing</a></li>
                <li><a href="#" class="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-4">Company</h4>
              <ul class="space-y-2 text-gray-400">
                <li><a href="#" class="hover:text-white">About</a></li>
                <li><a href="#" class="hover:text-white">Blog</a></li>
                <li><a href="#" class="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold mb-4">Legal</h4>
              <ul class="space-y-2 text-gray-400">
                <li><a href="#" class="hover:text-white">Privacy</a></li>
                <li><a href="#" class="hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          <div class="max-w-6xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>© 2025 Company. All rights reserved.</p>
          </div>
        </footer>
      `,
      attributes: { class: 'gjs-block-section' },
    });

    // Commands for device switching
    gjsEditor.Commands.add('set-device-desktop', {
      run: (editor) => editor.setDevice('Desktop'),
    });
    gjsEditor.Commands.add('set-device-tablet', {
      run: (editor) => editor.setDevice('Tablet'),
    });
    gjsEditor.Commands.add('set-device-mobile', {
      run: (editor) => editor.setDevice('Mobile'),
    });

    // Show panels commands
    gjsEditor.Commands.add('show-layers', {
      getRowEl(editor: Editor) { return editor.getContainer()?.closest('.editor-wrapper')?.querySelector('.layers-container'); },
      run(editor) {
        const lmEl = this.getRowEl(editor);
        if (lmEl) (lmEl as HTMLElement).style.display = '';
      },
      stop(editor) {
        const lmEl = this.getRowEl(editor);
        if (lmEl) (lmEl as HTMLElement).style.display = 'none';
      },
    });

    gjsEditor.Commands.add('show-styles', {
      getRowEl(editor: Editor) { return editor.getContainer()?.closest('.editor-wrapper')?.querySelector('.styles-container'); },
      run(editor) {
        const smEl = this.getRowEl(editor);
        if (smEl) (smEl as HTMLElement).style.display = '';
      },
      stop(editor) {
        const smEl = this.getRowEl(editor);
        if (smEl) (smEl as HTMLElement).style.display = 'none';
      },
    });

    // Load initial content
    if (initialComponents) {
      gjsEditor.setComponents(initialComponents);
    } else if (initialHtml) {
      gjsEditor.setComponents(initialHtml);
    }

    if (initialStyles) {
      gjsEditor.setStyle(initialStyles);
    } else if (initialCss) {
      gjsEditor.setStyle(initialCss);
    }

    // Handle changes
    gjsEditor.on('change:changesCount', () => {
      if (onChange) {
        onChange({
          html: gjsEditor.getHtml() || '',
          css: gjsEditor.getCss() || '',
          components: gjsEditor.getComponents(),
          styles: gjsEditor.getStyle(),
        });
      }
    });

    setEditor(gjsEditor);

    return () => {
      gjsEditor.destroy();
    };
  }, []);

  const handleSave = () => {
    if (editor && onSave) {
      onSave({
        html: editor.getHtml() || '',
        css: editor.getCss() || '',
        components: editor.getComponents(),
        styles: editor.getStyle(),
      });
    }
  };

  return (
    <div className="editor-wrapper h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <div className="panel__devices flex gap-1">
          {/* Device buttons rendered by GrapesJS */}
        </div>
        <div className="panel__switcher flex gap-1">
          {/* Panel switcher rendered by GrapesJS */}
        </div>
        {onSave && (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Save Page
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Blocks */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div id="blocks-container" className="p-2" />
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <div ref={editorRef} className="h-full" />
        </div>

        {/* Right Panel - Layers/Styles/Traits */}
        <div className="w-72 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="layers-container p-2" id="layers-container" />
          <div className="styles-container p-2" id="styles-container" style={{ display: 'none' }} />
          <div className="traits-container p-2" id="traits-container" style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
}
