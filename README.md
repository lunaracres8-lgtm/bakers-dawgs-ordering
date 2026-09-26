# Baker's Dawgs — LIVE CONNECTED BUILD

Customer page: `index.html`
Restaurant admin board: `admin.html`

This package is configured to the Baker's Dawgs Supabase project with the browser-safe publishable key.

Default admin PIN: 1357.

Upload all files together to the website repository/root.

SECURITY: The browser PIN is a temporary local access convenience, not a substitute for authenticated staff access. Before broad public launch, use Supabase Auth for restaurant staff and restrict order read/update/delete access to authenticated staff. Customer order creation should remain limited to only the fields/actions required to place an order.

## Staff biometrics in the reusable template

Each employee needs their own staff account. For a personal Android device, the employee signs in with their own email and password once, then enables fingerprint unlock. The APK asks Android to verify a biometric and opens only that saved staff session. The app does not store fingerprints or set an employee count limit; Android controls how many fingers can be saved on each device.

On a shared tablet, Android reports only that *a* saved fingerprint matched, not whose fingerprint it was. Do not add several employees' fingerprints to a shared Android profile expecting the app to identify each employee. Use **Switch Employee** and each person's staff credentials instead. For true fingerprint sign-in across shared devices, issue a separate account and passkey per employee, configure the business's Supabase Auth passkey relying party and Android Credential Manager support, and test that flow before selling it as a feature. The current APK's fingerprint button is a device unlock for one saved account, not that multi-employee passkey flow.
