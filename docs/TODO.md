# Lemure Project TODO List

## High Priority (Next 2 Weeks)

### Search Core Functionality
- [x] Fix traditional search results not appearing alongside AI answers
- [x] Ensure proper citation of sources in AI responses
- [x] Implement dynamic citation style updates (AGLC4, Chicago, Harvard)
- [x] Enable proper citation formatting with italics and live links
- [x] Fix Deep Research button integration in web search results
- [x] Optimize critique phase in deep research to reduce timeout issues
- [ ] Fix error handling for Groq API failures, especially around tool usage
- [x] Improve handling of rate limits and API timeouts

### Documentation & Architecture
- [ ] Create visual architecture diagram showing the flow from user query to displayed results
- [ ] Document the relationship between direct compound search and traditional search in the architecture
- [ ] Update documentation to reflect current TypeScript implementation (vs Python references)
- [ ] Add search protocol documentation with examples

### Error Handling
- [ ] Implement graceful fallbacks when either Groq or Tavily services are unavailable
- [ ] Add proper error states in the UI with user-friendly messages
- [ ] Implement better error logging for API failures

### Testing & Validation
- [ ] Create a basic test suite for the core search functionality
- [ ] Add integration tests for the Groq and Tavily API interactions
- [ ] Create a testing plan for the contextual follow-up feature

## Medium Priority (1-2 Months)

### Performance & Optimization
- [ ] Implement client-side caching for frequent searches
- [ ] Add server-side caching for API responses
- [ ] Optimize image loading in search results
- [ ] Add progressive loading for search results
- [ ] Implement caching strategies to save and reuse results for similar deep research queries
- [ ] Add source diversity metrics to ensure varied content sources in deep research

### Deep Research Enhancements
- [ ] Implement multi-modal research to include image and video analysis for more comprehensive results
- [ ] Add interactive reports that allow users to expand/collapse sections or rearrange report structures
- [ ] Create custom research profiles where users can save preferences for recurring research topics
- [ ] Implement export functionality for reports in various formats (PDF, Markdown) with citations intact
- [ ] Further enhance visualizations with charts, topic clustering, and hierarchical views in the results

### User Experience
- [ ] Design and implement better mobile interface for search results
- [ ] Improve search suggestions UI and functionality
- [ ] Add visual indicators for different result types (news, academic, etc.)
- [ ] Enhance the contextual follow-up UI with clearer guidance

### Infrastructure
- [ ] Set up monitoring for API rate limits and performance
- [ ] Implement proper logging system for debugging and analytics
- [ ] Create automated CI/CD pipeline for testing and deployment

## Features In Progress

### Multimodal Search
- [ ] Complete voice search input implementation
- [ ] Finish image search upload and processing
- [ ] Ensure proper error handling for multimodal inputs

### Subscription System
- [ ] Finalize the Pro user features and limitations
- [ ] Complete Stripe integration with proper error handling
- [ ] Implement subscription management UI

## Notes from Code Review

- Direct compound search now properly uses Groq's built-in search capabilities
- Traditional search results formatting needs to handle different response formats from Groq
- Need more robust error handling for API failures, especially for production use
- Documentation should be updated to match current implementation (TypeScript vs Python references)
- Add visual diagrams to make the architecture clearer
- Ensure tests exist for critical functionality
