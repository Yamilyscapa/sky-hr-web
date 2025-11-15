import { authClient } from "./auth-client";

async function setActiveOrganization() {
  try {
    const organizations = await authClient.organization.list();

    if (organizations.data && organizations.data.length > 0) {
      // Set the first organization as active
      const firstOrg = organizations.data[0];
      await authClient.organization.setActive({
        organizationId: firstOrg.id,
      });
      console.log("Set active organization:", firstOrg.name);
    }
  } catch (orgError) {
    console.error("Failed to set active organization:", orgError);
    // Don't rethrow - allow login to proceed even if setActive fails
  }
}

export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await authClient.signUp.email(
    {
      email,
      password,
      name,
      callbackURL: "/",
    },
    {
      onRequest: () => {
        console.log("Requesting sign up");
      },
      onSuccess: async () => {
        console.log("Sign up successful");
        // Don't await - let it run in background
        setActiveOrganization().catch(err => 
          console.error("Background setActiveOrganization failed:", err)
        );
      },
      onError: () => {
        console.log("Sign up failed");
      },
    },
  );

  return { data, error };
};

export const login = async (email: string, password: string) => {
  const { data, error } = await authClient.signIn.email(
    {
      email,
      password,
      callbackURL: "/",
      rememberMe: true,
    },
    {
      onRequest: () => {
        console.log("Requesting login");
      },
      onSuccess: async () => {
        console.log("Login successful");
        // Don't await - let it run in background
        setActiveOrganization().catch(err => 
          console.error("Background setActiveOrganization failed:", err)
        );
      },
      onError: () => {
        console.log("Login failed");
      },
    },
  );

  return { data, error };
};

export async function waitForSessionReady(
  maxAttempts = 5,
  delayMs = 150,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await authClient.getSession(
      {
        query: {
          disableCookieCache: true,
        },
      },
      {
        onRequest: () => {
          console.log("Polling for session");
        },
        onError: () => {
          console.log("Session poll failed");
        },
      },
    );

    if (data?.session && !error) {
      return data.session;
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error("Session not available yet");
}

export const isAuthenticated = async () => {
  const { data, error } = await authClient.getSession(
    {
      query: {
        disableCookieCache: true,
      },
    },
    {
      onRequest: () => {
        console.log("Requesting session");
      },
      onSuccess: () => {
        console.log("Session successful");
      },
      onError: () => {
        console.log("Session failed");
      },
    },
  );

  return { data, error };
};

export const logout = async () => {
  const { error } = await authClient.signOut();

  if (error) {
    console.error("Logout failed:", error);
    return;
  }
  
  window.location.reload();
};
