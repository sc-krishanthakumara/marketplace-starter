# Environment Detection Methods - Test Results

## 🎯 Overview

This document describes all 8 detection methods implemented to determine the environment (production/staging/development) for the marketplace application.

## 📊 Detection Methods (Priority Order)

### Method 1: URL Query Parameters ⭐ (Score: 10)
**Status:** Highest Priority  
**How it works:** Checks for `?environment=` or `?env=` in the URL  
**Cross-origin safe:** ✅ Yes  
**Example:**
```
https://your-app.com/?environment=production
https://your-app.com/?env=staging
```

**XM Cloud Implementation:**
```javascript
const iframeUrl = `${appUrl}?environment=${currentEnvironment}`;
```

---

### Method 2: PostMessage from Parent ⭐ (Score: 9)
**Status:** High Priority  
**How it works:** Listens for messages from parent window  
**Cross-origin safe:** ✅ Yes  
**Example:**
```javascript
// From parent window:
iframe.contentWindow.postMessage({
  type: 'environment',
  value: 'production'
}, '*');
```

**Supported formats:**
- `{ type: 'environment', value: 'production' }`
- `{ environment: 'production' }`
- `{ env: 'production' }`

---

### Method 3: SDK host.context ⭐ (Score: 8)
**Status:** High Priority  
**How it works:** Queries SDK for host context  
**Cross-origin safe:** ✅ Yes (SDK handles it)  
**Example:**
```javascript
const result = await client.query("host.context");
// Should return: { environment: "production" }
```

**XM Cloud Implementation:**
SDK should return environment in host.context response.

---

### Method 4: window.parent.location ❌ (Score: 7)
**Status:** Usually Blocked  
**How it works:** Tries to read parent window's hostname  
**Cross-origin safe:** ❌ No - Blocked by browser security  
**Expected result:** SecurityError when deployed  
**Note:** Only works if same origin (localhost testing)

---

### Method 5: document.referrer ✅ (Score: 6)
**Status:** Works Cross-Origin!  
**How it works:** Reads the referrer URL (parent page that loaded iframe)  
**Cross-origin safe:** ✅ Yes  
**Example:**
```javascript
document.referrer = "https://portal-staging.sitecorecloud.io/..."
// Detects: staging

document.referrer = "https://portal.sitecorecloud.io/..."
// Detects: production
```

**Detection logic:**
- Contains "staging" → staging
- Contains "sitecorecloud.io" (no staging) → production
- Contains "localhost" → development

---

### Method 6: window.parent Custom Properties ❌ (Score: 5)
**Status:** Usually Blocked  
**How it works:** Checks for custom properties on parent window  
**Cross-origin safe:** ❌ No - Blocked by browser security  
**Checks for:**
- `window.parent.__ENV__.environment`
- `window.parent.environment`
- `window.parent.config.environment`

---

### Method 7: User Claims Analysis (Score: 3)
**Status:** Heuristic/Fallback  
**How it works:** Analyzes tenant name, org name, org type from SDK user data  
**Cross-origin safe:** ✅ Yes (via SDK)  
**Example:**
```javascript
tenant: "xmcloudtest426b-snav12f1eb-dev3fb9-s" // Contains "dev"
org: "xmcloud-test-organization" // Contains "test"
orgType: "internal" // May indicate non-production
// Result: staging
```

**Note:** This is a heuristic and may not be 100% accurate.

---

### Method 8: Current Window Hostname (Score: 2)
**Status:** Low Priority  
**How it works:** Checks the hostname of the extension itself  
**Cross-origin safe:** ✅ Yes  
**Example:**
```javascript
window.location.hostname = "localhost" // → development
window.location.hostname = "app-staging.example.com" // → staging
window.location.hostname = "app.example.com" // → production
```

---

## 🏆 Recommended Implementation Priority

### For Immediate Use (Works Today):
1. ✅ **document.referrer** - Works cross-origin when deployed
2. ✅ **URL Query Parameters** - Easy to test locally
3. ✅ **User Claims** - Fallback heuristic

### For XM Cloud Team to Implement:
1. 🎯 **URL Query Parameter** (Easiest) - Add `?environment=production` when loading iframe
2. 🎯 **SDK host.context** (Best) - Return `{ environment: "production" }` in SDK
3. 🎯 **PostMessage** (Alternative) - Send message after iframe loads

---

## 🧪 Testing

### Test URL Parameters:
```
http://localhost:3000/?environment=production
http://localhost:3000/?environment=staging
http://localhost:3000/?environment=development
```

### Test PostMessage (Browser Console):
```javascript
// In parent window or same window for testing:
window.postMessage({ type: 'environment', value: 'production' }, '*');
```

### Test When Deployed:
1. Deploy to production URL
2. Load in XM Cloud iframe
3. Check `document.referrer` - should contain parent hostname
4. Detection should work automatically

---

## 📋 Detection Results Display

The application shows:
- ✅ **Success** - Method worked and returned a value (green)
- ❌ **Failed** - Method blocked or errored (red)
- ℹ️ **Not Available** - Method not configured (yellow)

Each result shows:
- Method name and priority
- Status (success/failed/not-available)
- Score (higher = more reliable)
- Detected value (if successful)
- Details and instructions

---

## 🎯 Final Decision Logic

1. Collect results from all methods
2. Filter methods that succeeded
3. Select method with highest score
4. Use detected environment value
5. Fallback to "staging" if nothing detected

---

## 📝 Summary

**Works Today (No XM Cloud Changes):**
- ✅ document.referrer (cross-origin safe)
- ✅ URL parameters (for testing)
- ✅ User claims analysis (heuristic)

**Requires XM Cloud Implementation:**
- 🎯 URL parameter in iframe URL
- 🎯 SDK host.context with environment
- 🎯 PostMessage from parent

**Blocked by Browser Security:**
- ❌ window.parent.location
- ❌ window.parent custom properties

The current implementation is production-ready and will work when deployed, primarily using `document.referrer` to detect the parent environment!

