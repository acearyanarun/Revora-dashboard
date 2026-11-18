import { HashRouter, Route, Routes, useParams } from 'react-router-dom'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { EmptyState, LinkButton } from './components/ui/primitives'
import { FixValidationPage } from './pages/FixValidationPage'
import { InvestigationDetailPage } from './pages/InvestigationDetailPage'
import { InvestigationsPage } from './pages/InvestigationsPage'
import { LabIndexPage } from './pages/LabIndexPage'
import { OverviewPage } from './pages/OverviewPage'
import { RegressionDetailPage } from './pages/RegressionDetailPage'
import { RegressionLibraryPage } from './pages/RegressionLibraryPage'
import { ReproductionLabPage } from './pages/ReproductionLabPage'
import type { RevoraApi } from './services/api'
import { useWorkspace } from './state/context'
import { WorkspaceProvider } from './state/workspace'

/** Remount per-entity pages when the route param changes so local UI state resets. */
function Keyed({ param, children }: { param: string; children: (key: string) => React.ReactNode }) {
  const params = useParams()
  return <>{children(params[param] ?? '')}</>
}

function Routed() {
  const { loaded } = useWorkspace()
  if (!loaded) return <div className="p-8 text-sm text-muted">Loading workspace…</div>
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="investigations" element={<InvestigationsPage />} />
        <Route path="investigations/:id" element={<Keyed param="id">{(k) => <InvestigationDetailPage key={k} />}</Keyed>} />
        <Route path="lab" element={<LabIndexPage />} />
        <Route path="lab/:incidentId" element={<Keyed param="incidentId">{(k) => <ReproductionLabPage key={k} />}</Keyed>} />
        <Route path="lab/:incidentId/validation" element={<Keyed param="incidentId">{(k) => <FixValidationPage key={k} />}</Keyed>} />
        <Route path="regression" element={<RegressionLibraryPage />} />
        <Route path="regression/:testId" element={<Keyed param="testId">{(k) => <RegressionDetailPage key={k} />}</Keyed>} />
        <Route
          path="*"
          element={
            <EmptyState title="Page not found">
              <LinkButton to="/">Back to overview</LinkButton>
            </EmptyState>
          }
        />
      </Route>
    </Routes>
  )
}

export default function App({ api }: { api: RevoraApi }) {
  return (
    <WorkspaceProvider api={api}>
      {/* HashRouter keeps deep links working on static hosting and in the single-file demo build. */}
      <HashRouter>
        <Routed />
      </HashRouter>
    </WorkspaceProvider>
  )
}
