# Privacy And Data Handling

Talent Ops Studio handles personal and business data. Keep the default portfolio build safe by using synthetic data.

## Rules

- Do not store real CVs in the repository.
- Do not commit CRM exports.
- Redact email, phone, compensation, and private notes in run logs.
- Keep uploaded files in Supabase Storage with private buckets.
- Use signed URLs only when a user intentionally opens a source file.
- Log summaries and evidence snippets, not full documents.

## Human Review Points

Require approval before:

- sending candidate recommendations outside the app
- writing a new lead to CRM
- generating outreach to a real person
- exporting records that include personal data
