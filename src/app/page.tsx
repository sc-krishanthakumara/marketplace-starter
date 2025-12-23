"use client";

import { useEffect, useState } from "react";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import { ApplicationContext } from "@sitecore-marketplace-sdk/client";

type EnvironmentType = "production" | "staging" | "development" | "unknown";

interface EnvironmentInfo {
  type: EnvironmentType;
  indicators: string[];
}

interface DetectionResult {
  method: string;
  status: "success" | "failed" | "not-available";
  value: string | null;
  details: string;
  score: number;
}

function CustomFieldExtension() {
  const { client, isInitialized, error } = useMarketplaceClient();
  const [appContext, setAppContext] = useState<ApplicationContext>();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [hostContext, setHostContext] = useState<any>(null);
  const [postMessageEnv, setPostMessageEnv] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [value, setValue] = useState<string>("");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [sdkQueries, setSdkQueries] = useState<string[]>([]);
  const [manualToken, setManualToken] = useState<string>("");

  // Preset options as buttons
  const options = ["Option A", "Option B", "Option C"];

  // Comprehensive detection function that tests ALL methods
  const runAllDetectionMethods = (): DetectionResult[] => {
    const results: DetectionResult[] = [];

    // METHOD 1: URL Query Parameters
    try {
      if (typeof window === 'undefined') {
        results.push({
          method: "1. URL Query Parameter",
          status: "not-available",
          value: null,
          details: "Running on server (SSR), window not available",
          score: 0
        });
      } else {
        const currentUrl = new URL(window.location.href);
        const urlParams = currentUrl.searchParams;
        const envParam = urlParams.get("environment") || urlParams.get("env");
      
      if (envParam) {
        results.push({
          method: "1. URL Query Parameter",
          status: "success",
          value: envParam,
          details: `Found ?environment=${envParam} or ?env=${envParam} in URL`,
          score: 10
        });
        } else {
          results.push({
            method: "1. URL Query Parameter",
            status: "not-available",
            value: null,
            details: "No ?environment or ?env parameter in URL. Add ?environment=production to test.",
            score: 0
          });
        }
      }
    } catch (e: any) {
      results.push({
        method: "1. URL Query Parameter",
        status: "failed",
        value: null,
        details: `Error: ${e.message}`,
        score: 0
      });
    }

    // METHOD 2: PostMessage from Parent
    if (postMessageEnv) {
      results.push({
        method: "2. PostMessage from Parent",
        status: "success",
        value: postMessageEnv,
        details: `Received postMessage with environment: ${postMessageEnv}`,
        score: 9
      });
    } else {
      results.push({
        method: "2. PostMessage from Parent",
        status: "not-available",
        value: null,
        details: "No postMessage received. Parent can send: window.frames[0].postMessage({ type: 'environment', value: 'production' }, '*')",
        score: 0
      });
    }

    // METHOD 3: SDK host.context
    if (hostContext) {
      if (hostContext.environment || hostContext.env) {
        const envValue = hostContext.environment || hostContext.env;
        results.push({
          method: "3. SDK host.context",
          status: "success",
          value: String(envValue),
          details: `SDK returned: ${JSON.stringify({ environment: envValue })}`,
          score: 8
        });
      } else {
        results.push({
          method: "3. SDK host.context",
          status: "not-available",
          value: null,
          details: `SDK query succeeded but no environment property. Returned: ${JSON.stringify(Object.keys(hostContext))}`,
          score: 0
        });
      }
    } else {
      results.push({
        method: "3. SDK host.context",
        status: "not-available",
        value: null,
        details: "SDK host.context query not available or returned no data. SDK should return { environment: 'production' }",
        score: 0
      });
    }

    // METHOD 4: window.parent.location
    try {
      if (typeof window === 'undefined') {
        results.push({
          method: "4. window.parent.location",
          status: "not-available",
          value: null,
          details: "Running on server (SSR), window not available",
          score: 0
        });
      } else if (window.parent && window.parent.location) {
        const hostname = window.parent.location.hostname;
        let detected = "unknown";
        
        if (hostname.includes("staging") || hostname.includes("stage")) {
          detected = "staging";
        } else if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
          detected = "development";
        } else if (hostname.includes("sitecorecloud.io")) {
          detected = "production";
        }
        
        results.push({
          method: "4. window.parent.location",
          status: "success",
          value: detected,
          details: `Parent hostname: ${hostname}`,
          score: 7
        });
      }
    } catch (e: any) {
      if (e.name === "SecurityError" || e.message?.includes("cross-origin")) {
        results.push({
          method: "4. window.parent.location",
          status: "failed",
          value: null,
          details: "❌ Blocked by cross-origin policy (expected when deployed). This is normal browser security.",
          score: 0
        });
      } else {
        results.push({
          method: "4. window.parent.location",
          status: "failed",
          value: null,
          details: `Error: ${e.message}`,
          score: 0
        });
      }
    }

    // METHOD 5: document.referrer
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      results.push({
        method: "5. document.referrer",
        status: "not-available",
        value: null,
        details: "Running on server (SSR), document not available",
        score: 0
      });
    } else if (document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        const hostname = referrerUrl.hostname.toLowerCase();
        let detected = "unknown";
        
        if (hostname.includes("staging") || hostname.includes("stage")) {
          detected = "staging";
        } else if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
          detected = "development";
        } else if (hostname.includes("sitecorecloud.io")) {
          detected = "production";
        }
        
        results.push({
          method: "5. document.referrer",
          status: "success",
          value: detected,
          details: `✅ Referrer hostname: ${hostname} (works cross-origin!)`,
          score: 6
        });
      } catch (e: any) {
        results.push({
          method: "5. document.referrer",
          status: "failed",
          value: null,
          details: `Invalid referrer URL: ${e.message}`,
          score: 0
        });
      }
    } else {
      results.push({
        method: "5. document.referrer",
        status: "not-available",
        value: null,
        details: "No referrer available. This happens when navigating directly to the page.",
        score: 0
      });
    }

    // METHOD 6: window.parent custom properties
    try {
      if (typeof window === 'undefined') {
        results.push({
          method: "6. window.parent custom properties",
          status: "not-available",
          value: null,
          details: "Running on server (SSR), window not available",
          score: 0
        });
      } else {
        const parentWindow = window.parent as any;
      let found = false;
      let envValue = null;
      let source = "";

      if (parentWindow.__ENV__?.environment) {
        envValue = parentWindow.__ENV__.environment;
        source = "window.parent.__ENV__.environment";
        found = true;
      } else if (parentWindow.environment) {
        envValue = typeof parentWindow.environment === 'string' 
          ? parentWindow.environment 
          : parentWindow.environment?.type;
        source = "window.parent.environment";
        found = true;
      } else if (parentWindow.config?.environment) {
        envValue = parentWindow.config.environment;
        source = "window.parent.config.environment";
        found = true;
      }

        if (found && envValue) {
          results.push({
            method: "6. window.parent custom properties",
            status: "success",
            value: String(envValue),
            details: `Found at: ${source} = "${envValue}"`,
            score: 5
          });
        } else {
          results.push({
            method: "6. window.parent custom properties",
            status: "not-available",
            value: null,
            details: "No custom properties found. Checked: __ENV__, environment, config.environment",
            score: 0
          });
        }
      }
    } catch (e: any) {
      if (e.name === "SecurityError" || e.message?.includes("cross-origin")) {
        results.push({
          method: "6. window.parent custom properties",
          status: "failed",
          value: null,
          details: "❌ Blocked by cross-origin policy (expected when deployed)",
          score: 0
        });
      } else {
        results.push({
          method: "6. window.parent custom properties",
          status: "failed",
          value: null,
          details: `Error: ${e.message}`,
          score: 0
        });
      }
    }

    // METHOD 7: User Claims
    if (userInfo) {
      const tenantName = userInfo["https://auth.sitecorecloud.io/claims/tenant_name"]?.toLowerCase() || "";
      const orgName = userInfo["https://auth.sitecorecloud.io/claims/org_name"]?.toLowerCase() || "";
      const orgType = userInfo["https://auth.sitecorecloud.io/claims/org_type"]?.toLowerCase() || "";
      
      let detected = "unknown";
      let reasoning = [];
      
      if (tenantName.includes("dev") || tenantName.includes("development")) {
        detected = "development";
        reasoning.push(`tenant contains "dev"`);
      } else if (tenantName.includes("staging") || tenantName.includes("stage")) {
        detected = "staging";
        reasoning.push(`tenant contains "staging"`);
      } else if (tenantName.includes("test")) {
        detected = "staging";
        reasoning.push(`tenant contains "test"`);
      }
      
      if (orgName.includes("test") || orgName.includes("staging") || orgName.includes("dev")) {
        if (detected === "unknown") detected = "staging";
        reasoning.push(`org contains test/staging/dev`);
      }
      
      if (orgType === "internal") {
        reasoning.push(`org type is "internal"`);
      }
      
      results.push({
        method: "7. User Claims Analysis (heuristic)",
        status: detected !== "unknown" ? "success" : "not-available",
        value: detected,
        details: `Tenant: "${tenantName}", Org: "${orgName}", Type: "${orgType}". Reasoning: ${reasoning.join(", ") || "No clear indicators"}`,
        score: 3
      });
    } else {
      results.push({
        method: "7. User Claims Analysis (heuristic)",
        status: "not-available",
        value: null,
        details: "User info not loaded yet from SDK host.user query",
        score: 0
      });
    }

    // METHOD 8: Current window hostname
    try {
      if (typeof window === 'undefined') {
        results.push({
          method: "8. Current window hostname",
          status: "not-available",
          value: null,
          details: "Running on server (SSR), window not available",
          score: 0
        });
      } else {
        const hostname = window.location.hostname.toLowerCase();
      let detected = "unknown";
      
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        detected = "development";
      } else if (hostname.includes("staging") || hostname.includes("stage")) {
        detected = "staging";
      } else if (hostname.includes("dev")) {
        detected = "development";
      } else if (hostname.includes("sitecorecloud.io")) {
        detected = "production";
      }
      
        results.push({
          method: "8. Current window hostname",
          status: detected !== "unknown" ? "success" : "not-available",
          value: detected,
          details: `Current hostname: ${hostname}`,
          score: 2
        });
      }
    } catch (e: any) {
      results.push({
        method: "8. Current window hostname",
        status: "failed",
        value: null,
        details: `Error: ${e.message}`,
        score: 0
      });
    }

    return results;
  };

  // Function to get environment from window.parent (fallback method)
  const getEnvironmentFromParentWindow = (): { type: EnvironmentType; indicators: string[] } => {
    const indicators: string[] = [];
    let type: EnvironmentType = "unknown";

    // Check window.parent.location.hostname (may fail due to cross-origin restrictions)
    try {
      if (window.parent && window.parent.location) {
        const hostname = window.parent.location.hostname.toLowerCase();
        indicators.push(`Parent window hostname: ${hostname}`);

        if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
          type = "development";
        } else if (hostname.includes("staging") || hostname.includes("stage")) {
          type = "staging";
        } else if (hostname.includes("dev") || hostname.includes("development")) {
          type = "development";
        } else if (hostname.includes("test")) {
          type = "staging";
        } else if (hostname.includes("sitecorecloud.io")) {
          // Check if it's staging subdomain
          if (hostname.includes("staging") || hostname.includes("stage")) {
            type = "staging";
          } else {
            type = "production";
          }
        }
      }
    } catch (e: any) {
      // Cross-origin restrictions prevent access to parent location
      // This is expected behavior when extension runs in iframe from different origin
      if (e.name === "SecurityError" || e.message?.includes("cross-origin")) {
        indicators.push(`Parent window location: Not accessible (cross-origin frame - this is normal)`);
      } else {
        indicators.push(`Parent window location: Error accessing - ${e.message || e}`);
      }
    }

    // Check window.parent for environment-related properties
    try {
      const parentWindow = window.parent as any;
      
      if (parentWindow.__ENV__) {
        const env = parentWindow.__ENV__;
        indicators.push(`Parent window.__ENV__: ${JSON.stringify(env)}`);
        if (env.environment) {
          type = env.environment.toLowerCase() as EnvironmentType;
        }
      }
      if (parentWindow.environment) {
        const env = parentWindow.environment;
        indicators.push(`Parent window.environment: ${JSON.stringify(env)}`);
        if (typeof env === 'string') {
          type = env.toLowerCase() as EnvironmentType;
        } else if (env?.type) {
          type = env.type.toLowerCase() as EnvironmentType;
        }
      }
      if (parentWindow.config?.environment) {
        const env = parentWindow.config.environment;
        indicators.push(`Parent window.config.environment: ${JSON.stringify(env)}`);
        type = env.toLowerCase() as EnvironmentType;
      }
      
      // If we couldn't find environment properties, note it
      if (type === "unknown" && !parentWindow.__ENV__ && !parentWindow.environment && !parentWindow.config?.environment) {
        indicators.push(`Parent window: No environment properties found (__ENV__, environment, or config.environment)`);
      }
    } catch (e: any) {
      // Cross-origin restrictions, skip
      if (e.name === "SecurityError" || e.message?.includes("cross-origin")) {
        indicators.push(`Parent window properties: Not accessible (cross-origin frame - this is normal)`);
      } else {
        indicators.push(`Parent window properties: Error accessing - ${e.message || e}`);
      }
    }

    return { type, indicators };
  };

  // Function to determine environment based on available context
  const detectEnvironment = (
    appCtx: ApplicationContext | undefined, 
    user: any, 
    hostCtx: any,
    postMsgEnv: string | null
  ): EnvironmentInfo => {
    const indicators: string[] = [];
    let stagingScore = 0;
    let productionScore = 0;
    let detectedType: EnvironmentType | null = null;

    // ========================================
    // PRIORITY METHOD 1: URL Query Parameters
    // ========================================
    try {
      const currentUrl = new URL(window.location.href);
      const urlParams = currentUrl.searchParams;
      
      // Check for environment in URL parameters
      const envParam = urlParams.get("environment") || urlParams.get("env");
      if (envParam) {
        const env = envParam.toLowerCase();
        indicators.push(`✅ URL Parameter environment="${env}" (HIGHEST PRIORITY)`);
        if (env === "production" || env === "prod") {
          detectedType = "production";
          productionScore += 10; // Highest priority
        } else if (env === "staging" || env === "stage") {
          detectedType = "staging";
          stagingScore += 10; // Highest priority
        } else if (env === "development" || env === "dev") {
          detectedType = "development";
          stagingScore += 9; // Highest priority
        }
      } else {
        indicators.push(`ℹ️ URL Parameter: Not provided (add ?environment=production or ?env=staging to URL)`);
      }
    } catch (e) {
      // Error accessing URL, skip
    }

    // ========================================
    // PRIORITY METHOD 2: PostMessage from Parent
    // ========================================
    if (postMsgEnv) {
      const env = postMsgEnv.toLowerCase();
      indicators.push(`✅ PostMessage environment="${env}" (HIGH PRIORITY - received from parent window)`);
      if (!detectedType) {
        if (env === "production" || env === "prod") {
          detectedType = "production";
          productionScore += 9;
        } else if (env === "staging" || env === "stage") {
          detectedType = "staging";
          stagingScore += 9;
        } else if (env === "development" || env === "dev") {
          detectedType = "development";
          stagingScore += 8;
        }
      }
    } else {
      indicators.push(`ℹ️ PostMessage: Not received (parent window should send: window.frames[0].postMessage({ type: 'environment', value: 'production' }, '*'))`);
    }

    // ========================================
    // PRIORITY METHOD 3: SDK Host Context
    // ========================================
    if (hostCtx) {
      indicators.push(`✅ Host context available: ${JSON.stringify(Object.keys(hostCtx))}`);
      
      // Check for common environment properties in host context
      if (hostCtx.environment) {
        const env = String(hostCtx.environment).toLowerCase();
        indicators.push(`✅ SDK host.context.environment="${env}" (HIGH PRIORITY)`);
        if (!detectedType) {
          if (env === "production" || env === "prod") {
            detectedType = "production";
            productionScore += 8;
          } else if (env === "staging" || env === "stage") {
            detectedType = "staging";
            stagingScore += 8;
          } else if (env === "development" || env === "dev") {
            detectedType = "development";
            stagingScore += 7;
          }
        }
      }
      
      if (hostCtx.env) {
        const env = String(hostCtx.env).toLowerCase();
        indicators.push(`✅ SDK host.context.env="${env}" (HIGH PRIORITY)`);
        if (!detectedType) {
          if (env === "production" || env === "prod") {
            detectedType = "production";
            productionScore += 8;
          } else if (env === "staging" || env === "stage") {
            detectedType = "staging";
            stagingScore += 8;
          } else if (env === "development" || env === "dev") {
            detectedType = "development";
            stagingScore += 7;
          }
        }
      }

      // Check hostname from host context if available
      if (hostCtx.hostname || hostCtx.url) {
        const hostname = (hostCtx.hostname || new URL(hostCtx.url).hostname).toLowerCase();
        indicators.push(`Host context hostname: ${hostname}`);
        
        if (hostname.includes("staging") || hostname.includes("stage")) {
          stagingScore += 3;
          if (!detectedType) detectedType = "staging";
        } else if (hostname.includes("dev") || hostname.includes("development")) {
          stagingScore += 2;
          if (!detectedType) detectedType = "development";
        } else if (hostname.includes("test")) {
          stagingScore += 2;
          if (!detectedType) detectedType = "staging";
        } else if (hostname.includes("sitecorecloud.io") && !hostname.includes("staging")) {
          productionScore += 2;
          if (!detectedType) detectedType = "production";
        }
      }
      
      if (!hostCtx.environment && !hostCtx.env) {
        indicators.push(`ℹ️ SDK host.context: No environment property found (SDK should return { environment: 'production' })`);
      }
    } else {
      indicators.push(`ℹ️ SDK host.context: Query not available or returned no data`);
    }

    // ========================================
    // FALLBACK METHOD 1: Check window.parent (cross-origin usually blocked)
    // ========================================
    if (!detectedType || stagingScore === 0 && productionScore === 0) {
      const parentEnv = getEnvironmentFromParentWindow();
      indicators.push(...parentEnv.indicators);
      if (parentEnv.type !== "unknown") {
        if (!detectedType) {
          detectedType = parentEnv.type;
        }
        if (parentEnv.type === "production") {
          productionScore += 3;
        } else if (parentEnv.type === "staging" || parentEnv.type === "development") {
          stagingScore += 3;
        }
      }
    }

    // ========================================
    // FALLBACK METHOD 2: Check user info for tenant and organization details (heuristic)
    // ========================================
    if (user) {
      const tenantName = user["https://auth.sitecorecloud.io/claims/tenant_name"]?.toLowerCase() || "";
      const orgName = user["https://auth.sitecorecloud.io/claims/org_name"]?.toLowerCase() || "";
      const orgDisplayName = user["https://auth.sitecorecloud.io/claims/org_display_name"]?.toLowerCase() || "";
      const orgType = user["https://auth.sitecorecloud.io/claims/org_type"]?.toLowerCase() || "";

      // Check tenant name (strong indicator)
      if (tenantName) {
        indicators.push(`Tenant name: "${tenantName}"`);
        if (tenantName.includes("dev") || tenantName.includes("development")) {
          stagingScore += 4;
          if (!detectedType) detectedType = "development";
        } else if (tenantName.includes("staging") || tenantName.includes("stage")) {
          stagingScore += 4;
          if (!detectedType) detectedType = "staging";
        } else if (tenantName.includes("test")) {
          stagingScore += 3;
          if (!detectedType) detectedType = "staging";
        }
      }

      // Check organization name
      if (orgName) {
        indicators.push(`Organization name: "${orgName}"`);
        if (orgName.includes("test") || orgName.includes("staging") || orgName.includes("dev")) {
          stagingScore += 3;
          if (!detectedType && !tenantName.includes("dev") && !tenantName.includes("staging")) {
            detectedType = "staging";
          }
        }
      }

      // Check organization display name
      if (orgDisplayName) {
        if (orgDisplayName.includes("test") || orgDisplayName.includes("staging") || orgDisplayName.includes("dev")) {
          indicators.push(`Organization display name: "${orgDisplayName}" (contains test/staging/dev indicator)`);
          stagingScore += 2;
        }
      }

      // Check organization type
      if (orgType === "internal") {
        indicators.push(`Organization type: "${orgType}" (may indicate non-production)`);
        stagingScore += 1;
      } else if (orgType === "customer" || orgType === "external") {
        indicators.push(`Organization type: "${orgType}" (may indicate production)`);
        productionScore += 1;
      }
    }

    // ========================================
    // FALLBACK METHOD 3: Document Referrer
    // ========================================
    try {
      // Check document.referrer for environment clues
      if (document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          const referrerHostname = referrerUrl.hostname.toLowerCase();
          indicators.push(`Document referrer: ${referrerHostname}`);
          
          if (referrerHostname.includes("staging") || referrerHostname.includes("stage")) {
            stagingScore += 2;
            if (!detectedType) detectedType = "staging";
          } else if (referrerHostname.includes("dev") || referrerHostname.includes("development")) {
            stagingScore += 2;
            if (!detectedType) detectedType = "development";
          } else if (referrerHostname.includes("test")) {
            stagingScore += 2;
            if (!detectedType) detectedType = "staging";
          } else if (referrerHostname.includes("sitecorecloud.io") && !referrerHostname.includes("staging")) {
            productionScore += 1;
            if (!detectedType) detectedType = "production";
          }
        } catch (e) {
          // Invalid referrer URL, skip
        }
      }
    } catch (e) {
      // Error accessing URL, skip
    }

    // ========================================
    // FALLBACK METHOD 4: Check URL hostname from app context
    // ========================================
    if (appCtx?.url) {
      try {
        const url = new URL(appCtx.url);
        const hostname = url.hostname.toLowerCase();
        indicators.push(`App context URL hostname: ${hostname}`);
        
        if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
          stagingScore += 2;
          if (!detectedType) detectedType = "development";
        } else if (hostname.includes("staging") || hostname.includes("stage")) {
          stagingScore += 3;
          if (!detectedType) detectedType = "staging";
        } else if (hostname.includes("dev") || hostname.includes("development")) {
          stagingScore += 2;
          if (!detectedType) detectedType = "development";
        } else if (hostname.includes("test")) {
          stagingScore += 2;
          if (!detectedType) detectedType = "staging";
        } else if (hostname.includes("sitecorecloud.io") && !hostname.includes("staging")) {
          productionScore += 1;
          if (!detectedType) detectedType = "production";
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }

    // Determine final environment type
    let type: EnvironmentType = detectedType || "unknown";
    
    if (type === "unknown") {
      // Fallback to scoring if no direct detection
      if (stagingScore > productionScore && stagingScore > 0) {
        type = stagingScore >= 3 ? "staging" : "development";
      } else if (productionScore > stagingScore && productionScore > 0) {
        type = "production";
      }
    }

    // Add summary indicator
    if (indicators.length > 0) {
      indicators.push(`--- Detection Summary: ${type} (staging score: ${stagingScore}, production score: ${productionScore}) ---`);
    }

    return { type, indicators };
  };

  // Listen for postMessage from parent window (for environment information)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: In production, validate event.origin
      // For now, we accept messages from any origin for demo purposes
      console.log("Received postMessage:", event.data);
      
      if (event.data && typeof event.data === 'object') {
        // Check for environment message in various formats
        if (event.data.type === 'environment' && event.data.value) {
          console.log("Environment from postMessage:", event.data.value);
          setPostMessageEnv(event.data.value);
        } else if (event.data.environment) {
          console.log("Environment from postMessage:", event.data.environment);
          setPostMessageEnv(event.data.environment);
        } else if (event.data.env) {
          console.log("Environment from postMessage:", event.data.env);
          setPostMessageEnv(event.data.env);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    console.log("PostMessage listener added. Parent can send environment via: window.frames[0].postMessage({ type: 'environment', value: 'production' }, '*')");

    // Trigger initial detection even without SDK (for development mode)
    setTimeout(() => {
      if (!isInitialized && detectionResults.length === 0) {
        const results = runAllDetectionMethods();
        setDetectionResults(results);
        const envInfo = detectEnvironment(appContext, userInfo, hostContext, postMessageEnv);
        setEnvironmentInfo(envInfo);
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

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

      // Try to query host context for environment information
      // @ts-ignore - host.context might not be in QueryMap type but may be available
      client.query("host.context" as any)
        .then((res) => {
          console.log("Success retrieving host.context:", res.data);
          setHostContext(res.data);
        })
        .catch((error) => {
          console.log("host.context not available, will use fallback methods:", error.message);
          // Not an error - this query might not be available in all SDK versions
        });
    } else if (error) {
      console.error("Error initializing Marketplace client:", error);
    }
  }, [client, error, isInitialized]);

  // Update environment info when appContext, userInfo, hostContext, or postMessageEnv changes
  useEffect(() => {
    // Run detection even in dev mode (without SDK)
    const isStandalone = typeof window !== 'undefined' && 
                        (!window.parent || window.parent === window);
    const shouldRun = appContext || userInfo || hostContext || postMessageEnv || isStandalone;
    
    if (shouldRun) {
      const envInfo = detectEnvironment(appContext, userInfo, hostContext, postMessageEnv);
      setEnvironmentInfo(envInfo);
      
      // Run all detection methods and store results
      const results = runAllDetectionMethods();
      setDetectionResults(results);
      console.log("=== ALL DETECTION METHODS ===");
      results.forEach(r => {
        console.log(`${r.method}: ${r.status} - ${r.value || 'N/A'} (score: ${r.score})`);
        console.log(`  Details: ${r.details}`);
      });
    }
  }, [appContext, userInfo, hostContext, postMessageEnv]);

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

  const getEnvironmentColor = (type: EnvironmentType): string => {
    switch (type) {
      case "production":
        return "#28a745"; // Green
      case "staging":
        return "#ffc107"; // Yellow/Orange
      case "development":
        return "#17a2b8"; // Blue/Cyan
      default:
        return "#6c757d"; // Gray
    }
  };

  const getEnvironmentLabel = (type: EnvironmentType): string => {
    switch (type) {
      case "production":
        return "Production";
      case "staging":
        return "Staging";
      case "development":
        return "Development";
      default:
        return "Unknown";
    }
  };

  // Check if we're in development mode (direct access, not in XM Cloud)
  // Only check on client side to avoid SSR issues
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);

  useEffect(() => {
    // Check development mode only on client side
    const devMode = typeof window !== 'undefined' && (
      !window.parent || 
      window.parent === window || 
      window.location.search.includes('devmode=true')
    );
    setIsDevelopmentMode(devMode);
  }, []);

  return (
    <div>
      {(isInitialized || isDevelopmentMode) ? (
        <div>
          <h1>Welcome to {appContext?.name || "Development Test"}</h1>
          <p>This is a custom field extension.</p>
          {isDevelopmentMode && !isInitialized && (
            <div style={{
              padding: "10px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "4px",
              marginBottom: "20px",
              fontSize: "14px"
            }}>
              ⚠️ <strong>Development Mode:</strong> SDK not initialized. Some features may not work.
              Running in standalone mode for testing.
            </div>
          )}

          {/* All Detection Methods Results */}
          {detectionResults.length > 0 && (
            <div style={{
              marginTop: "20px",
              marginBottom: "20px",
              padding: "20px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              border: "2px solid #007bff"
            }}>
              <h2 style={{ marginTop: 0, marginBottom: "15px", color: "#007bff" }}>
                🔍 All Detection Methods - Test Results
              </h2>
              
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                  Testing all 8 detection methods to find environment. Methods are ordered by priority (highest score wins).
                </p>
              </div>

              {detectionResults.map((result, index) => {
                const bgColor = result.status === "success" ? "#d4edda" : 
                               result.status === "failed" ? "#f8d7da" : "#fff3cd";
                const borderColor = result.status === "success" ? "#28a745" : 
                                   result.status === "failed" ? "#dc3545" : "#ffc107";
                const textColor = result.status === "success" ? "#155724" : 
                                 result.status === "failed" ? "#721c24" : "#856404";
                
                return (
                  <div key={index} style={{
                    marginBottom: "15px",
                    padding: "15px",
                    backgroundColor: bgColor,
                    borderLeft: `4px solid ${borderColor}`,
                    borderRadius: "4px"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px"
                    }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: "15px",
                        color: textColor,
                        fontWeight: "bold"
                      }}>
                        {result.method}
                      </h4>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{
                          padding: "3px 8px",
                          backgroundColor: result.status === "success" ? "#28a745" : 
                                         result.status === "failed" ? "#dc3545" : "#ffc107",
                          color: "#fff",
                          borderRadius: "3px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          textTransform: "uppercase"
                        }}>
                          {result.status}
                        </span>
                        <span style={{
                          padding: "3px 8px",
                          backgroundColor: "#6c757d",
                          color: "#fff",
                          borderRadius: "3px",
                          fontSize: "11px",
                          fontWeight: "bold"
                        }}>
                          Score: {result.score}
                        </span>
                      </div>
                    </div>
                    
                    {result.value && (
                      <div style={{ 
                        marginBottom: "8px",
                        padding: "8px 12px",
                        backgroundColor: "rgba(255,255,255,0.7)",
                        borderRadius: "3px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: "#333"
                      }}>
                        Detected: <span style={{ 
                          color: result.value === "production" ? "#28a745" : 
                                result.value === "staging" ? "#ffc107" : "#17a2b8"
                        }}>
                          {result.value.toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <p style={{ 
                      margin: 0, 
                      fontSize: "13px",
                      color: textColor,
                      lineHeight: "1.5"
                    }}>
                      {result.details}
                    </p>
                  </div>
                );
              })}

              <div style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#e7f3ff",
                borderRadius: "4px",
                border: "1px solid #007bff"
              }}>
                <h4 style={{ marginTop: 0, marginBottom: "10px", color: "#007bff" }}>
                  📊 Final Decision
                </h4>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  <strong>Selected Environment:</strong>{" "}
                  <span style={{
                    padding: "4px 12px",
                    backgroundColor: environmentInfo ? getEnvironmentColor(environmentInfo.type) : "#6c757d",
                    color: "#fff",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    fontSize: "16px"
                  }}>
                    {environmentInfo ? getEnvironmentLabel(environmentInfo.type) : "Unknown"}
                  </span>
                </p>
                <p style={{ marginTop: "10px", marginBottom: 0, fontSize: "13px", color: "#666" }}>
                  The method with the highest score that returned a value wins. Check console for detailed logs.
                </p>
              </div>

              <div style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#fff",
                borderRadius: "4px",
                border: "1px solid #ddd"
              }}>
                <h4 style={{ marginTop: 0, marginBottom: "10px" }}>
                  🧪 Test Methods
                </h4>
                <p style={{ fontSize: "13px", marginBottom: "10px", color: "#666" }}>
                  Try these to test different detection methods:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <button
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set("environment", "production");
                      window.location.href = url.toString();
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#28a745",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    Add ?environment=production
                  </button>
                  <button
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set("environment", "staging");
                      window.location.href = url.toString();
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#ffc107",
                      color: "#000",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    Add ?environment=staging
                  </button>
                  <button
                    onClick={() => {
                      window.postMessage({ type: 'environment', value: 'production' }, '*');
                      alert("Sent postMessage with environment=production. Check results above!");
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    Test PostMessage (production)
                  </button>
                  <button
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.delete("environment");
                      url.searchParams.delete("env");
                      window.location.href = url.toString();
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    Clear URL Parameters
                  </button>
                </div>
              </div>
            </div>
          )}

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
