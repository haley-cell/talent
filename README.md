# Talent Ops Studio

Talent Ops Studio is a working demo of an AI operations desk for recruiting, sales follow-up, and prospect research.

It is built for teams that spend too much time reading CVs, checking messy CRM exports, qualifying leads by hand, and trying to keep track of why a recommendation was made. Instead of acting like a black box, the app turns each workflow into a reviewable decision with scores, evidence, gaps, next steps, and an activity trail.

## What You Can Do

### Review Candidates

Paste or upload a CV, add the target role, and run a candidate match.

Talent Ops Studio returns:

- A fit score for the candidate.
- A plain-language recommendation.
- Evidence pulled from the candidate profile.
- Gaps or risks to check before moving forward.
- A suggested dispatch decision, such as whether to send the profile to a client or hold for review.

### Find CRM Follow-Ups

Upload or paste CRM deal data and let the app highlight opportunities that need attention.

It helps identify:

- Deals that have gone quiet.
- Accounts with missing follow-ups.
- Pipeline risk by deal stage.
- Suggested next actions for business development.
- Revenue that may need immediate attention.

### Qualify Prospects

Describe your ideal customer profile, add lead sources or prospect notes, and run a qualification pass.

The app produces:

- Fit scores for prospects.
- Reasons why each lead is or is not a good match.
- Suggested next actions.
- A review step before capturing promising prospects into the workspace.

### Review the Work

Every completed workflow creates a review record.

These records show:

- What was analyzed.
- What result was produced.
- Which evidence supported the result.
- Whether the output is ready or needs human review.
- Which analysis provider was used.

This makes the demo easier to inspect, explain, and trust.

## Who It Is For

Talent Ops Studio is useful for showing how AI can support:

- Recruiters screening candidates against open roles.
- Staffing teams preparing candidate shortlists.
- Sales teams cleaning up CRM follow-up work.
- Business development teams qualifying prospects.
- Operators who need AI suggestions with a review trail.

## Demo Walkthrough

1. Open the Operations Desk to see the three main workflows.
2. Run Candidate Review with a CV and job description.
3. Check the match score, evidence, gaps, and recommendation.
4. Run CRM Actions with a deal export.
5. Review stalled deals and next-best follow-ups.
6. Run Lead Capture with an ideal customer profile and prospect list.
7. Open Reviews to see the activity trail for each run.

## Running the App

Install dependencies and start the local app:

```bash
npm install
npm run dev
```

The interface can load locally without a connected analysis backend, but live analysis runs need the app settings to be configured first.

## Portfolio Context

This project was built as a portfolio product for AI-assisted talent and revenue operations. It demonstrates practical AI workflows for candidate matching, CRM analysis, prospect qualification, reviewable recommendations, and human-in-the-loop decision support.
