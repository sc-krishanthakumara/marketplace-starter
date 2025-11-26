"use client";

import { useEffect, useState } from "react";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import { ApplicationContext } from "@sitecore-marketplace-sdk/client";

function CustomFieldExtension() {
  const { client, isInitialized, error } = useMarketplaceClient();
  const [appContext, setAppContext] = useState<ApplicationContext>();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [sdkQueries, setSdkQueries] = useState<string[]>([]);
  const [manualToken, setManualToken] = useState<string>("");

  // Preset options as buttons
  const options = ["Option A", "Option B", "Option C"];

  useEffect(() => {
    if (!error && isInitialized && client) {
      console.log("Marketplace client initialized successfully.");
      console.log("Client object:", client);
      
      // Try to discover available modules and operations
      try {
        // @ts-ignore
        const availableModules = client.availableModules?.() || [];
        console.log("Available SDK modules:", availableModules);
        setSdkQueries(availableModules);
      } catch (e) {
        console.log("Could not retrieve available modules:", e);
     }
      
      // Make a query to retrieve the application context
      client.query("application.context")
        .then((res) => {
          console.log("Success retrieving application.context:", res.data);
          setAppContext(res.data);
        })
        .catch((error) => {
          console.error("Error retrieving application.context:", error);
        });

      // Query for current user information
      client.query("host.user")
        .then((res) => {
          console.log("Success retrieving host.user:", res.data);
          setUserInfo(res.data);
        })
        .catch((error) => {
          console.error("Error retrieving host.user:", error);
          setUserError(error.message || "Failed to retrieve user info");
        });
    } else if (error) {
      console.error("Error initializing Marketplace client:", error);
    }
  }, [client, error, isInitialized]);

  const handleClick = (selected: string) => {
    setValue(selected);
    if (client) client.setValue(selected);
    setTimeout(() => client?.closeApp(), 1000);
  };

  const tryExtractToken = () => {
    try {
      // Try to find auth token in various storage locations
      const sources = {
        localStorage: [] as string[],
        sessionStorage: [] as string[],
        cookies: document.cookie
      };

      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('token') || key.includes('auth') || key.includes('sitecore'))) {
          sources.localStorage.push(`${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
        }
      }

      // Check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('token') || key.includes('auth') || key.includes('sitecore'))) {
          sources.sessionStorage.push(`${key}: ${sessionStorage.getItem(key)?.substring(0, 50)}...`);
        }
      }

      console.log("Storage inspection:", sources);
      setApiResponse({
        message: "Token search results (check console for full output)",
        localStorage: sources.localStorage,
        sessionStorage: sources.sessionStorage,
        cookiesPresent: sources.cookies ? "Yes (check console)" : "No",
        note: "The SDK manages auth internally. Token may not be accessible from app context."
      });
    } catch (err) {
      console.error("Error inspecting storage:", err);
      setApiError("Could not inspect browser storage: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const fetchWithManualToken = async () => {
    if (!manualToken.trim()) {
      setApiError("Please paste a token first");
      return;
    }

    setIsLoadingApi(true);
    setApiError(null);
    setApiResponse(null);

    try {
      console.log("Making direct API call with manual token...");
      
      const apiUrl = 'https://api-euw-cdpp.sitecorecloud.io/search-config/v1/config';
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Bearer ${manualToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      setApiResponse(data);
      console.log("Search config API response:", data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setApiError(errorMessage);
      console.error("Error fetching search config:", err);
    } finally {
      setIsLoadingApi(false);
    }
  };

  const fetchSearchConfig = async () => {
    setIsLoadingApi(true);
    setApiError(null);
    setApiResponse(null);

    try {
      console.log("Making authenticated API call using SDK's internal fetch...");
      
      if (!client) {
        throw new Error("Client SDK is not initialized");
      }

      // The SDK proxies requests through Sitecore's edge platform
      // Let's try the proxied path format
      const apiUrl = '/search-config/v1/config';
      
      console.log("Attempting to call:", apiUrl);

      // Create a Request object for the API call
      const request = new Request(apiUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      });

      // Use the SDK's internal _fetch method which automatically includes authentication
      // @ts-ignore - accessing private method
      const response = await client._fetch(request);

      console.log("Response status:", response.status);
      console.log("Response URL:", response.url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      setApiResponse(data);
      console.log("Search config API response:", data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setApiError(errorMessage);
      console.error("Error fetching search config:", err);
    } finally {
      setIsLoadingApi(false);
    }
  };

  return (
    <div>
      {isInitialized ? (
        <div>
          <h1>Welcome to {appContext?.name}</h1>
          <p>This is a custom field extension.</p>

          <div className="application-context">
            <h3>Application Context:</h3>
            <ul className="context-details">
              <li><strong>Name:</strong> {appContext?.name}</li>
              <li><strong>ID:</strong> {appContext?.id}</li>
              <li><strong>Icon URL:</strong> {appContext?.iconUrl}</li>
              <li><strong>Installation ID:</strong> {appContext?.installationId}</li>
              <li><strong>State:</strong> {appContext?.state}</li>
              <li><strong>Type:</strong> {appContext?.type}</li>
              <li><strong>URL:</strong> {appContext?.url}</li>
            </ul>
          </div>

          <div className="user-info" style={{ 
            marginTop: "20px", 
            padding: "15px", 
            backgroundColor: "#f5f5f5", 
            borderRadius: "8px",
            border: "1px solid #ddd"
          }}>
            <h3>Current User Information from SDK:</h3>
            {userError ? (
              <p style={{ color: "red" }}>Error: {userError}</p>
            ) : userInfo ? (
              <div>
                <div style={{ marginBottom: "15px" }}>
                  <h4 style={{ marginBottom: "10px" }}>📋 Raw User Data:</h4>
                  <pre style={{ 
                    backgroundColor: "#fff", 
                    padding: "15px", 
                    borderRadius: "4px",
                    overflow: "auto",
                    fontSize: "12px",
                    border: "1px solid #ddd",
                    maxHeight: "300px"
                  }}>
                    {JSON.stringify(userInfo, null, 2)}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(userInfo, null, 2));
                      alert("User info copied to clipboard!");
                    }}
                    style={{
                      marginTop: "10px",
                      padding: "8px 16px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      borderRadius: "4px",
                      fontSize: "13px"
                    }}
                  >
                    📋 Copy to Clipboard
                  </button>
                </div>
                <div style={{ marginTop: "15px" }}>
                  <h4>👤 All User Properties:</h4>
                  <ul className="context-details" style={{ 
                    backgroundColor: "#fff", 
                    padding: "15px", 
                    borderRadius: "4px",
                    border: "1px solid #ddd"
                  }}>
                    {Object.keys(userInfo).length > 0 ? (
                      Object.entries(userInfo).map(([key, value]) => (
                        <li key={key} style={{ marginBottom: "8px" }}>
                          <strong>{key}:</strong>{" "}
                          {typeof value === 'object' && value !== null ? (
                            <pre style={{ 
                              display: "inline-block", 
                              margin: "5px 0 0 0", 
                              padding: "8px", 
                              backgroundColor: "#f8f9fa",
                              borderRadius: "3px",
                              fontSize: "11px",
                              maxWidth: "100%",
                              overflow: "auto"
                            }}>
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            <code style={{ 
                              wordBreak: "break-all", 
                              backgroundColor: (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) ? "#fff3cd" : "#f8f9fa", 
                              padding: "2px 6px", 
                              borderRadius: "3px",
                              fontSize: "12px"
                            }}>
                              {String(value)}
                            </code>
                          )}
                        </li>
                      ))
                    ) : (
                      <li style={{ color: "#6c757d" }}>No user properties available</li>
                    )}
                  </ul>
                </div>
                <p style={{ 
                  marginTop: "15px", 
                  padding: "10px", 
                  backgroundColor: "#fff3cd", 
                  borderLeft: "4px solid #ffc107",
                  fontSize: "13px"
                }}>
                  <strong>⚠️ Note:</strong> For security reasons, the SDK typically doesn&apos;t expose raw auth tokens directly to client apps. The Host SDK manages authentication and attaches tokens to API requests behind the scenes.
                </p>
              </div>
            ) : (
              <p>Loading user information...</p>
            )}
          </div>

          <div className="api-test" style={{ 
            marginTop: "20px", 
            padding: "15px", 
            backgroundColor: "#d4edda", 
            borderRadius: "8px",
            border: "2px solid #28a745"
          }}>
            <h3 style={{ color: "#155724" }}>✅ Working Method: Manual Token</h3>
            <p style={{ fontSize: "13px", marginBottom: "15px", color: "#155724" }}>
              <strong>How to get your token:</strong><br/>
              1. Open Browser DevTools (F12) → Network tab<br/>
              2. Perform any action in XM Cloud (navigate, edit content, etc.)<br/>
              3. Find any API request to <code>sitecorecloud.io</code><br/>
              4. Click request → Headers tab → Copy the <code>Authorization</code> token<br/>
              5. Paste below (without &quot;Bearer &quot; prefix)
            </p>
            <textarea
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste your auth token here (e.g., eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIs...)"
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #28a745",
                fontSize: "12px",
                fontFamily: "monospace",
                marginBottom: "10px"
              }}
            />
            <button
              onClick={fetchWithManualToken}
              disabled={isLoadingApi || !manualToken.trim()}
              style={{
                padding: "12px 24px",
                backgroundColor: isLoadingApi || !manualToken.trim() ? "#ccc" : "#28a745",
                color: "#fff",
                border: "none",
                cursor: isLoadingApi || !manualToken.trim() ? "not-allowed" : "pointer",
                borderRadius: "4px",
                fontSize: "16px",
                fontWeight: "bold"
              }}
            >
              {isLoadingApi ? "Loading..." : "🚀 Fetch Search Config"}
            </button>

          <details style={{ marginTop: "15px" }}>
            <summary style={{ 
              cursor: "pointer", 
              padding: "10px", 
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
              fontWeight: "bold"
            }}>
              🔍 Other Methods (for reference)
            </summary>
            <div style={{ 
              marginTop: "10px", 
              padding: "15px", 
              backgroundColor: "#fff3cd", 
              borderRadius: "8px",
              border: "1px solid #ffc107"
            }}>
              <h4>SDK Proxy Method (Returns 404)</h4>
              <p style={{ fontSize: "13px", marginBottom: "10px" }}>
                The SDK proxies requests through <code>edge-platform-staging.sitecore-staging.cloud</code>, 
                but the Search Config API endpoint isn&apos;t registered in that proxy routing.
              </p>
              <button
                onClick={fetchSearchConfig}
                disabled={isLoadingApi}
                style={{
                  padding: "8px 16px",
                  backgroundColor: isLoadingApi ? "#ccc" : "#6c757d",
                  color: "#fff",
                  border: "none",
                  cursor: isLoadingApi ? "not-allowed" : "pointer",
                  borderRadius: "4px",
                  fontSize: "14px",
                  marginRight: "10px"
                }}
              >
                Try SDK Proxy (will 404)
              </button>
              <button
                onClick={tryExtractToken}
                disabled={isLoadingApi}
                style={{
                  padding: "8px 16px",
                  backgroundColor: isLoadingApi ? "#ccc" : "#6c757d",
                  color: "#fff",
                  border: "none",
                  cursor: isLoadingApi ? "not-allowed" : "pointer",
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              >
                Inspect Browser Storage
              </button>
            </div>
          </details>

          {apiError && (
            <div style={{ 
              marginTop: "15px", 
              padding: "10px", 
              backgroundColor: "#f8d7da", 
              color: "#721c24",
              borderRadius: "4px",
              border: "1px solid #f5c6cb"
            }}>
              <strong>Error:</strong> {apiError}
            </div>
          )}

          {apiResponse && (
            <div style={{ marginTop: "15px" }}>
              <h4>✅ API Response:</h4>
              <pre style={{ 
                backgroundColor: "#fff", 
                padding: "15px", 
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "12px",
                maxHeight: "400px",
                border: "2px solid #28a745"
              }}>
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          )}
          </div>

          <div className="custom-field-extension">

          <p>Click a button to set the value.</p>
          {options.map(opt => (
            <button
              key={opt}
              style={{
                padding: "10px 20px",
                margin: "10px",
                backgroundColor: value === opt ? "#0078d4" : "#eee",
                color: value === opt ? "#fff" : "#000",
                border: "none",
                cursor: "pointer",
                borderRadius: "4px"
              }}
              onClick={() => handleClick(opt)}
            >
              {opt}
            </button>
          ))}
          </div>
        </div>
      ) : (
        <p>Initializing extension...</p>
      )}
      {error && <p style={{ color: "red" }}>Error: {String(error)}</p>}
    </div>
  );
}

export default CustomFieldExtension;
