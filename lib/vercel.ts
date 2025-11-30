export const addDomainToVercel = async (domain: string) => {
  if (!process.env.VERCEL_PROJECT_ID) {
    throw new Error("VERCEL_PROJECT_ID environment variable is not set");
  }
  if (!process.env.VERCEL_API_TOKEN) {
    throw new Error("VERCEL_API_TOKEN environment variable is not set");
  }

  const teamIdParam = process.env.VERCEL_TEAM_ID
    ? `?teamId=${process.env.VERCEL_TEAM_ID}`
    : "";

  const response = await fetch(
    `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains${teamIdParam}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: domain,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || `Vercel API error: ${response.status}`,
    );
  }

  return data;
};

export const removeDomainFromVercel = async (domain: string) => {
  if (!process.env.VERCEL_PROJECT_ID || !process.env.VERCEL_API_TOKEN) {
    return;
  }

  const teamIdParam = process.env.VERCEL_TEAM_ID
    ? `?teamId=${process.env.VERCEL_TEAM_ID}`
    : "";

  const response = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}${teamIdParam}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    // domain might not exist
  }

  return data;
};

export const getDomainResponse = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}?teamId=${process.env.VERCEL_TEAM_ID}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => {
    return res.json();
  });
};

export const verifyDomain = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}/verify?teamId=${process.env.VERCEL_TEAM_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json());
};
