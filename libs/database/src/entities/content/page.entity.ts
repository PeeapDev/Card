import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // GrapesJS content
  @Column({ type: 'text', nullable: true })
  html: string;

  @Column({ type: 'text', nullable: true })
  css: string;

  @Column({ type: 'jsonb', nullable: true })
  components: any;

  @Column({ type: 'jsonb', nullable: true })
  styles: any;

  @Column({ type: 'jsonb', default: '[]' })
  assets: any[];

  // Page settings
  @Column({ name: 'page_type', type: 'varchar', length: 50, default: 'page' })
  pageType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  template: string;

  // SEO
  @Column({ name: 'meta_title', type: 'varchar', length: 255, nullable: true })
  metaTitle: string;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string;

  @Column({ name: 'meta_keywords', type: 'text', nullable: true })
  metaKeywords: string;

  @Column({ name: 'og_image', type: 'varchar', length: 500, nullable: true })
  ogImage: string;

  @Column({ name: 'canonical_url', type: 'varchar', length: 500, nullable: true })
  canonicalUrl: string;

  // Status
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ name: 'is_homepage', type: 'boolean', default: false })
  isHomepage: boolean;

  @Column({ name: 'show_in_nav', type: 'boolean', default: false })
  showInNav: boolean;

  @Column({ name: 'nav_order', type: 'integer', default: 0 })
  navOrder: number;

  // Access control
  @Column({ name: 'require_auth', type: 'boolean', default: false })
  requireAuth: boolean;

  @Column({ name: 'allowed_roles', type: 'text', array: true, nullable: true })
  allowedRoles: string[];

  // Scheduling
  @Column({ name: 'published_at', type: 'timestamp with time zone', nullable: true })
  publishedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt: Date;

  // Metadata
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}

@Entity('page_templates')
export class PageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  // Template content
  @Column({ type: 'text', nullable: true })
  html: string;

  @Column({ type: 'text', nullable: true })
  css: string;

  @Column({ type: 'jsonb', nullable: true })
  components: any;

  @Column({ type: 'jsonb', nullable: true })
  styles: any;

  // Settings
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
