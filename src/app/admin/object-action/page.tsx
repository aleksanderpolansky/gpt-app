import Link from "next/link";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

type AppUserRow = {
  id: string;
  auth0_sub: string;
  email: string | null;
  name: string | null;
};

type PlatformAdminRow = {
  id: string;
  app_user_id: string;
  role: string;
  status: string;
};

type HubCard = {
  title: string;
  href: string;
  description: string;
  badge: string;
};

type PageData = {
  appUser: AppUserRow | null;
  platformAdmin: PlatformAdminRow | null;
  errorMessage: string | null;
};

const HUB_CARDS: HubCard[] = [
  {
    title: "Object-Action categories",
    href: "/admin/object-action/categories",
    description:
      "Review contextual categories, their status, origin from suggestions and category mutation audit history.",
    badge: "Categories",
  },
  {
    title: "Suggestion moderation",
    href: "/admin/object-action/suggestions",
    description:
      "Moderate user-submitted missing business directions and approve or reject suggested category mappings.",
    badge: "Moderation",
  },
  {
    title: "Entity classifications",
    href: "/admin/object-action/classifications",
    description:
      "Read-only overview of how organizations and other entities are classified in the Object-Action Rubricator.",
    badge: "Classifications",
  },
  {
    title: "Public directory",
    href: "/directory",
    description:
      "Open the public business directory and verify how approved categories and classifications are visible to users.",
    badge: "Public",
  },
];

async function getCurrentAppUser(): Promise<{
  appUser: AppUserRow | null;
  errorMessage: string | null;
}> {
  const session = await auth0.getSession();

  if (!session?.user?.sub) {
    return {
      appUser: null,
      errorMessage: "Not authenticated",
    };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select(
      `
      id,
      auth0_sub,
      email,
      name
    `
    )
    .eq("auth0_sub", session.user.sub)
    .limit(1);

  if (error) {
    return {
      appUser: null,
      errorMessage: error.message,
    };
  }

  const rows = (data as unknown as AppUserRow[] | null) ?? [];

  if (!rows[0]) {
    return {
      appUser: null,
      errorMessage: "App user not found",
    };
  }

  return {
    appUser: rows[0],
    errorMessage: null,
  };
}

async function getPlatformAdmin(appUserId: string): Promise<{
  platformAdmin: PlatformAdminRow | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("platform_admins")
    .select(
      `
      id,
      app_user_id,
      role,
      status
    `
    )
    .eq("app_user_id", appUserId)
    .eq("status", "active")
    .limit(1);

  if (error) {
    return {
      platformAdmin: null,
      errorMessage: error.message,
    };
  }

  const rows = (data as unknown as PlatformAdminRow[] | null) ?? [];

  if (!rows[0]) {
    return {
      platformAdmin: null,
      errorMessage: "Platform admin access required",
    };
  }

  return {
    platformAdmin: rows[0],
    errorMessage: null,
  };
}

async function getPageData(): Promise<PageData> {
  const { appUser, errorMessage: appUserErrorMessage } =
    await getCurrentAppUser();

  if (appUserErrorMessage || !appUser) {
    return {
      appUser: null,
      platformAdmin: null,
      errorMessage: appUserErrorMessage ?? "Not authenticated",
    };
  }

  const { platformAdmin, errorMessage: platformAdminErrorMessage } =
    await getPlatformAdmin(appUser.id);

  if (platformAdminErrorMessage || !platformAdmin) {
    return {
      appUser,
      platformAdmin: null,
      errorMessage:
        platformAdminErrorMessage ?? "Platform admin access required",
    };
  }

  return {
    appUser,
    platformAdmin,
    errorMessage: null,
  };
}

function getCardStyle(index: number) {
  if (index === 0) {
    return {
      border: "1px solid #bfdbfe",
      background: "#eff6ff",
    };
  }

  if (index === 1) {
    return {
      border: "1px solid #f0d28a",
      background: "#fff8e6",
    };
  }

  if (index === 2) {
    return {
      border: "1px solid #bbf7d0",
      background: "#f0fdf4",
    };
  }

  return {
    border: "1px solid #dddddd",
    background: "#ffffff",
  };
}

export default async function AdminObjectActionHubPage() {
  const { appUser, platformAdmin, errorMessage } = await getPageData();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        padding: "40px 16px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
                        <Link
              href="/admin"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontWeight: 700,
              }}
            >
              Admin hub
            </Link>
<Link
              href="/directory"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              {"\u2190"} Public directory
            </Link>

            <Link
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Home
            </Link>
          </div>

          <h1
            style={{
              fontSize: "36px",
              lineHeight: "1.15",
              fontWeight: 800,
              margin: "0 0 10px",
            }}
          >
            Object-Action admin hub
          </h1>

          <p
            style={{
              margin: "0 0 8px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Central entry point for Object-Action Rubricator administration.
            This hub does not mutate data.
          </p>

          <p
            style={{
              margin: 0,
              color: "#666666",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            Use this page to navigate between categories, suggestion moderation,
            entity classifications and the public directory.
          </p>
        </header>

        {errorMessage ? (
          <section
            style={{
              border: "1px solid #f2b8b5",
              borderRadius: "12px",
              padding: "22px",
              background: "#fff5f5",
              color: "#a40000",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Access or loading error</h2>
            <p style={{ marginBottom: 0 }}>{errorMessage}</p>
          </section>
        ) : null}

        {!errorMessage && appUser && platformAdmin ? (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  border: "1px solid #bbf7d0",
                  borderRadius: "16px",
                  padding: "22px",
                  background: "#f0fdf4",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#166534", marginBottom: "8px" }}>
                  Admin
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800 }}>
                  {appUser.email ?? appUser.name ?? appUser.id}
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    color: "#166534",
                    fontSize: "14px",
                  }}
                >
                  role: {platformAdmin.role}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #bfdbfe",
                  borderRadius: "16px",
                  padding: "22px",
                  background: "#eff6ff",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ color: "#1e3a8a", marginBottom: "8px" }}>
                  Admin pages
                </div>
                <div style={{ fontSize: "34px", fontWeight: 800 }}>3</div>
                <div
                  style={{
                    marginTop: "6px",
                    color: "#1e3a8a",
                    fontSize: "14px",
                  }}
                >
                  categories, suggestions, classifications
                </div>
              </div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
              }}
            >
              {HUB_CARDS.map((card, index) => {
                const cardStyle = getCardStyle(index);

                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    style={{
                      ...cardStyle,
                      borderRadius: "16px",
                      padding: "22px",
                      textDecoration: "none",
                      color: "#111111",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          borderRadius: "999px",
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontWeight: 800,
                          background: "#ffffff",
                          border: "1px solid #dddddd",
                          color: "#444444",
                        }}
                      >
                        {card.badge}
                      </span>

                      <span
                        style={{
                          color: "#2563eb",
                          fontWeight: 800,
                        }}
                      >
                        {"\u2192"}
                      </span>
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        lineHeight: "1.25",
                      }}
                    >
                      {card.title}
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color: "#555555",
                        lineHeight: "1.5",
                      }}
                    >
                      {card.description}
                    </p>
                  </Link>
                );
              })}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
