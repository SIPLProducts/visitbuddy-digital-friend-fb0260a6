# Restore production login

## Confirmed cause
The certificate served by `https://vms.resustainability.com/` expired on **27 September 2026 at 23:59:59 UTC**. A normal browser rejects the login page with `ERR_CERT_DATE_INVALID`; the supplied screenshot shows the resulting “Failed to fetch” error. This is an HTTPS deployment problem, not a reason to alter the login screen or sign-in logic.

The deployed bundle points its authentication client at `https://vms.resustainability.com/`. With certificate checks bypassed **for diagnosis only**, the public authentication health endpoint responds, a browser can submit the normal password-login request, and a deliberately invalid test account gets the expected `400 invalid_credentials` response. The tested request and CORS preflight succeed. A valid-user sign-in remains unverified.

## Fix
1. Identify where HTTPS for the production domain actually terminates (server Nginx or an upstream load balancer) and renew/replace the expired certificate **and its complete chain** there. Confirm automatic renewal covers this endpoint; do not disable browser certificate validation or change the login API.
2. Keep the frontend’s production API URL and publishable key aligned with the authentication service. Inspect the deployed production environment and generated bundle without exposing key values; change deployment configuration only if they differ from the live endpoint.
3. Add a non-destructive production certificate / auth reachability check to the existing deployment health checks so an expiring or invalid certificate fails visibly instead of silently breaking login.
4. Verify from a normal browser (without certificate bypass): page loads, auth request reaches the configured endpoint, and CORS works. Then test with an authorized real account if one is available, confirming the dashboard loads. If server or account access is unavailable, report those verification limits explicitly.

## Deployment boundary
This workspace contains the deployment scripts, but not shell access to the production HTTPS terminator. Source changes alone cannot renew a certificate already installed on the live server; the certificate owner must install the replacement and reload the serving service. No login UI or application authentication behavior will be changed unless a separate, verified production configuration defect is found.
