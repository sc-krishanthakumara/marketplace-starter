// API Route for proxying GraphQL requests to Sitecore
// This runs server-side, avoiding CORS issues

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get environment variables
    const endpoint = process.env.NEXT_PUBLIC_AUTHORING_GRAPHQL_ENDPOINT;
    const apiKey = process.env.NEXT_PUBLIC_AUTHORING_API_KEY;
    const bearerToken = process.env.NEXT_PUBLIC_AUTHORING_BEARER_TOKEN;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'GraphQL endpoint not configured' },
        { status: 500 }
      );
    }

    // Get the GraphQL query and variables from the request
    const body = await request.json();

    // Determine authentication method: Bearer token (Authoring API) or API key (Edge/Preview)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (bearerToken) {
      // Use Bearer token for Authoring API
      headers['Authorization'] = `Bearer ${bearerToken}`;
    } else if (apiKey) {
      // Use API key for Edge/Preview API
      headers['sc_apikey'] = apiKey;
    } else {
      return NextResponse.json(
        { error: 'No authentication credentials configured' },
        { status: 500 }
      );
    }

    // Forward the request to Sitecore's GraphQL API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'GraphQL request failed', details: data },
        { status: response.status }
      );
    }

    // Return the GraphQL response
    return NextResponse.json(data);

  } catch (error) {
    console.error('GraphQL proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Enable CORS for the API route (so the iframe can call it)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
