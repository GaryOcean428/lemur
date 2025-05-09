## Lemur Pricing Strategy & Tier Recommendations

Based on research of Perplexity AI and general SaaS pricing models, here are recommendations for Lemur's pricing structure and user tiers. This also incorporates the user's specific requests regarding model access and deep research capabilities.

### User Tiers & Features:

1.  **Free Tier:**
    *   **Purpose:** Allow users to experience the basic functionality and understand the value proposition.
    *   **Features:**
        *   Limited number of searches per day/month (e.g., User suggestion: 1 search per session for non-signed-in, 20 searches per month for signed-in free users).
        *   Access to basic search results (e.g., web search via Tavily).
        *   Limited access to AI models (e.g., `compound-beta-mini` or a similar less resource-intensive model if available for free use, or a very limited number of queries to more advanced models).
        *   No access to deep research or academic research features.
        *   No ability to save/store research results beyond the current session (or very limited storage).
        *   Ads could be considered for this tier to support operational costs if desired.
    *   **Pricing:** $0

2.  **Basic Tier:**
    *   **Purpose:** Offer a good balance of features for users who need more than the free tier but don't require the full power of the Pro tier.
    *   **Features:**
        *   Increased number of searches per month (e.g., User suggestion: 100 searches per month).
        *   Access to standard AI models (e.g., `compound-beta-mini` as specified by the user, potentially `gpt-4.1-mini` if cost-effective).
        *   Limited access to deep research features (e.g., a certain number of deep research queries per month, or access to a less intensive version).
        *   Limited access to academic research (Serper Google Scholar) - perhaps a small number of queries.
        *   Ability to save a limited number of search results/research projects.
        *   No ads.
    *   **Pricing Suggestion:** $5 - $10 / month (aligning with or slightly undercutting similar entry-level AI tool subscriptions).

3.  **Pro Tier:**
    *   **Purpose:** Provide full access to all features for power users and professionals.
    *   **Features:**
        *   Unlimited searches (as per user suggestion).
        *   Access to the most advanced AI models available (e.g., full `compound-beta`, `gpt-4.1` or higher, future advanced models).
        *   Full access to deep research capabilities.
        *   Full access to academic research (Serper Google Scholar).
        *   Extensive or unlimited storage for saved search results and research projects.
        *   Priority support.
        *   No ads.
    *   **Pricing Suggestion:** $15 - $25 / month (competitive with Perplexity Pro's $20/month, adjust based on actual API costs and perceived value of unique features like Groq + Serper integration).

### Pricing Model Considerations:

*   **Freemium Model:** The proposed tier structure follows a freemium model, which is common for SaaS and AI tools. It allows users to try before they buy.
*   **Value-Based Pricing:** The features offered in each tier should clearly justify the price difference. The Pro tier, with unlimited searches and access to the best models and deep research, offers significant value.
*   **Cost Analysis:** Crucially, the pricing needs to cover the operational costs, especially the API costs for:
    *   Groq models (compound-beta, compound-beta-mini)
    *   Tavily Search API
    *   Serper Google Scholar API
    *   OpenAI API (if gpt-4.1 or other OpenAI models are used)
    *   Firebase hosting and Firestore usage.
    It's important to estimate the average API calls per user per tier to ensure profitability.
*   **Competitor Benchmarking:** Continuously monitor pricing from competitors like Perplexity, ChatGPT Plus, etc., to remain competitive.
*   **Annual Discount:** Consider offering a discount for annual subscriptions (e.g., 15-20% off, similar to Perplexity's $400/year for Enterprise Pro which is a 16.7% discount from $40/month * 12).
*   **Usage-Based vs. Fixed Tiers:** While the current proposal is fixed tiers, for very high-volume Pro users or enterprise clients, a usage-based component or custom enterprise plans could be considered in the future.

### Justification for Proposed Pricing (Example for Pro Tier at $20/month):

*   **Perplexity Pro is $20/month:** This sets a market expectation.
*   **Lemur's Unique Selling Proposition (USP):**
    *   **Groq Models:** Potentially faster and/or more cost-effective for certain tasks.
    *   **Agentic Tooling & Deep Research Focus:** If Lemur's deep research is significantly better or more specialized than competitors, it can command a similar or higher price.
    *   **Serper Google Scholar Integration:** Specialized academic search is a valuable niche.
*   **Cost Structure:** The API costs will be a major factor. If Groq + Tavily + Serper + (potentially) OpenAI API calls for an active Pro user are substantial, the pricing needs to reflect that.

### Recommendations for Implementation:

1.  **Backend Logic:** Implement robust tracking of search counts and API calls per user, tied to their Firebase UID and subscription tier.
2.  **Frontend UI:** Clearly display the user's current tier, usage, and options to upgrade. Make the benefits of higher tiers obvious.
3.  **Payment Integration:** Integrate a payment gateway (e.g., Stripe, which was mentioned in the original codebase's `routes.ts` but commented out) to handle subscriptions for Basic and Pro tiers.
4.  **User Management:** Ensure users can easily upgrade, downgrade, or cancel their subscriptions.

### Next Steps (after user feedback on this initial proposal):

*   Refine the pricing points based on user feedback and a more detailed cost analysis.
*   Develop the UI/UX for displaying tier information and upgrade paths.
*   Implement the payment gateway integration.

This pricing strategy aims to be competitive while reflecting the value provided by Lemur's unique features and covering operational costs.

