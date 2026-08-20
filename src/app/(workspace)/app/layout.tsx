import { requireActiveOrganization } from "@/lib/auth/dal";
import { WorkspaceMobileNav, WorkspaceSidebar, WorkspaceTopBar } from "@/components/nav/workspace-nav";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { organization, session } = await requireActiveOrganization();

  return (
    <div className="flex min-h-screen bg-[#07090d] text-white">
      {/* Desktop sidebar */}
      <WorkspaceSidebar
        orgName={organization.name}
        roles={organization.roles}
        userName={session.userName}
      />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — visible on all screen sizes */}
        <WorkspaceTopBar
          orgName={organization.name}
          roles={organization.roles}
          userName={session.userName}
        />

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <WorkspaceMobileNav roles={organization.roles} />
    </div>
  );
}

