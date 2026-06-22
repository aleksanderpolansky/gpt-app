import Link from "next/link";
import { auth0 } from "../../../lib/auth0";
import { supabase } from "../../../lib/supabase";

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

type AdminCard = {
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

const ADMIN_CARDS: AdminCard[] = [
  {
    title: "AI EUR Billing",
    href: "/admin/ai-billing",
    description:
      "Manual admin grant UI for adding AI EUR balance through the server-side ledger route.",
    badge: "AI Billing",
  },

  {
    title: "Object-Action Rubricator",
    href: "/admin/object-action",
    description:
      "Central hub for contextual categories, suggestion moderation and entity classifications.",
    badge: "Rubricator",
  },
  {
    title: "Public directory",
    href: "/directory",
    description:
      "Open the public business directory and verify how organizations, categories and offers are visible to users.",
    badge: "Public",
  },
  {
    title: "Organizations",
    href: "/organizations",
    description:
      "Open the internal organizations area for checking created organizations and related business data.",
    badge: "Organizations",
  },
  {
    title: "Offers",
    href: "/offers",
    description:
      "Open offers and commercial objects connected to organizations, certificates and public directory pages.",
    badge: "Offers",
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
      border: "1px solid #bbf7d0",
      background: "#f0fdf4",
    };
  }

  if (index === 2) {
    return {
      border: "1px solid #f0d28a",
      background: "#fff8e6",
    };
  }

  return {
    border: "1px solid #dddddd",
    background: "#ffffff",
  };
}

export default async function AdminHubPage() {
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
              href="/"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Home
            </Link>

            <Link
              href="/directory"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
              }}
            >
              Public directory {"\u2192"}
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
            Admin hub
          </h1>

          <p
            style={{
              margin: "0 0 8px",
              color: "#555555",
              fontSize: "16px",
              lineHeight: "1.5",
            }}
          >
            Central entry point for internal administration pages. This page
            does not mutate data.
          </p>

          <p
            style={{
              margin: 0,
              color: "#666666",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            Use this page to navigate to Object-Action administration, public
            directory checks, organizations and offers.
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
                  Main admin areas
                </div>
                <div style={{ fontSize: "34px", fontWeight: 800 }}>
                  {ADMIN_CARDS.length}
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    color: "#1e3a8a",
                    fontSize: "14px",
                  }}
                >
                  available from this hub
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
              {ADMIN_CARDS.map((card, index) => {
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
