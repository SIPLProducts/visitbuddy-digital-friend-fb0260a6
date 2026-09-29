# Verify the three SSL renewal files

## Verified findings
- `document-f04f9fb83d39d9a7.txt` contains **two CA certificates**, not a server certificate: first `RapidSSL TLS RSA CA G1` (intermediate, valid until 2 November 2027), then `DigiCert Global Root G2` (root, valid until 15 January 2038). Neither covers `*.resustainability.com` or matches the supplied private key.
- `DigiCert_CA_Bundle.zip` contains those same two CA certificates as separate `.pem` files. It supplies the trust chain, **not** the renewed server certificate.
- `star_resustainability.com_2026.key` parses as a private key. Its public-key SHA-256 is `9045a17cea52c23357f29a35cc58b3a7226ac9ea6b9913d0d7b37defb3b5d549`. Never share or commit the private key.
- The public site currently presents an expired **Sectigo** `*.resustainability.com` server certificate (expired 27 September 2026 23:59:59 UTC) and serves no intermediate certificate. This is separate from the uploaded DigiCert/RapidSSL bundle.
- The pasted server output confirms the active Nginx certificate path is `/etc/nginx/ssl/STAR_resustainability_com.crt` and key path is `/etc/nginx/ssl/star_resustainability.com_2026.key`. The `/home/vmsadm/STAR_resustainability_com_new.zip` file contains a Sectigo wildcard certificate with the **same 27 September 2026 expiry**: despite its filename, it is not a renewed certificate. The pasted `openssl rsa -check` establishes only that the server key is structurally valid, **not** that it matches a new leaf certificate. The grep output also includes files under `sites-available`; confirm which HTTPS server block is actually loaded with `sudo nginx -T` before any eventual change.

## What to request from the client
Ask for **the renewed end-entity/server/leaf X.509 certificate for `*.resustainability.com`**, issued against the CSR associated with `star_resustainability.com_2026.key`, supplied as a PEM `.crt` or `.pem` file (`-----BEGIN CERTIFICATE-----`), **not** another CA bundle or private key. Request the issuer's full-chain file too if available, so the exact intermediate is confirmed. The filename/extension alone does not establish which certificate it is.

Tell the client that both their supplied DigiCert files are **CA-only**, while the ZIP already on the server contains a **Sectigo leaf that expired on 27 September**. Ask them to provide the *actual newly issued* wildcard leaf, its expiry date and issuer, and the corresponding intermediate chain. If the new leaf was issued from a different CSR, ask for its matching private key via a secure channel; do not email or paste a private key into chat. Avoid mixing Sectigo and DigiCert chains.

## Before any installation
Check the new leaf's Subject Alternative Name includes `DNS:*.resustainability.com`, its validity window, issuer, server-auth purpose, and matching public key. Verify its chain with the corresponding CA intermediate/root; only then determine the actual live TLS termination and certificate paths with the server operator. Do not edit configuration, reload, or restart production until those checks pass and an operator approves the change.

Read-only checks the server operator can run now:

```bash
sudo nginx -T 2>&1 | grep -E 'server_name|listen .*443|ssl_certificate'
sudo openssl x509 -in /etc/nginx/ssl/STAR_resustainability_com.crt -noout -subject -issuer -dates -ext subjectAltName
unzip -p /home/vmsadm/STAR_resustainability_com_new.zip STAR_resustainability_com.crt | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

Once the *new* leaf is received, compare its public-key fingerprint with that of the intended key and verify the chain and hostname offline **before** presenting any Nginx change/reload instructions. Do not replace the active `.crt` with either CA-only file or the expired ZIP certificate.

**Blocked:** The renewed server certificate is not among the three files. No production changes were made.
