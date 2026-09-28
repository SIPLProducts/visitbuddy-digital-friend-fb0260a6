# Verify the three SSL renewal files

## Verified findings
- `document-f04f9fb83d39d9a7.txt` contains **two CA certificates**, not a server certificate: first `RapidSSL TLS RSA CA G1` (intermediate, valid until 2 November 2027), then `DigiCert Global Root G2` (root, valid until 15 January 2038). Neither covers `*.resustainability.com` or matches the supplied private key.
- `DigiCert_CA_Bundle.zip` contains those same two CA certificates as separate `.pem` files. It supplies the trust chain, **not** the renewed server certificate.
- `star_resustainability.com_2026.key` parses as a private key. Its public-key SHA-256 is `9045a17cea52c23357f29a35cc58b3a7226ac9ea6b9913d0d7b37defb3b5d549`. Never share or commit the private key.
- The public site currently presents an expired **Sectigo** `*.resustainability.com` server certificate (expired 27 September 2026 23:59:59 UTC) and serves no intermediate certificate. This is separate from the uploaded DigiCert/RapidSSL bundle.

## What to request from the client
Ask for **the renewed end-entity/server/leaf X.509 certificate for `*.resustainability.com`**, issued against the CSR associated with `star_resustainability.com_2026.key`, supplied as a PEM `.crt` or `.pem` file (`-----BEGIN CERTIFICATE-----`), **not** another CA bundle or private key. Request the issuer's full-chain file too if available, so the exact intermediate is confirmed. The filename/extension alone does not establish which certificate it is.

## Before any installation
Check the new leaf's Subject Alternative Name includes `DNS:*.resustainability.com`, its validity window, issuer, server-auth purpose, and matching public key. Verify its chain with the corresponding CA intermediate/root; only then determine the actual live TLS termination and certificate paths with the server operator. Do not edit configuration, reload, or restart production until those checks pass and an operator approves the change.

**Blocked:** The renewed server certificate is not among the three files. No production changes were made.
