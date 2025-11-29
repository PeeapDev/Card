import { Routes, Route } from 'react-router-dom';
import { StandaloneDeveloperLayout } from '@/components/layout/StandaloneDeveloperLayout';
import {
  DeveloperOverview,
  ApiKeysPanel,
  WebhooksPanel,
  RequestLogsPanel,
  SandboxPanel,
  SDKDocsPanel,
} from '@/components/developer/DeveloperPanel';

export function AgentDeveloperPage() {
  return (
    <StandaloneDeveloperLayout
      homeRoute="/agent"
      homeLabel="Agent Portal"
      basePath="/agent/developer"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Dashboard</h1>
          <p className="text-gray-500">Manage your API integration and developer resources</p>
        </div>
        <Routes>
          <Route index element={<DeveloperOverview />} />
          <Route path="api-keys" element={<ApiKeysPanel />} />
          <Route path="webhooks" element={<WebhooksPanel />} />
          <Route path="logs" element={<RequestLogsPanel />} />
          <Route path="sandbox" element={<SandboxPanel />} />
          <Route path="docs" element={<SDKDocsPanel />} />
        </Routes>
      </div>
    </StandaloneDeveloperLayout>
  );
}
