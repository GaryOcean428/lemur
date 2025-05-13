# Deep Research Button Integration

This document outlines the implementation of the "Deep Research" button in web search results, which allows users to seamlessly transition from regular web search to deep research mode.

## Overview

The Deep Research button appears in web search results and enables users (specifically those with Pro tier subscriptions) to initiate a deep research session using the current search query as a starting point. This creates a smooth workflow where users can first get quick results and then choose to dive deeper into a topic if needed.

## Implementation Details

1. **Button Placement**: 
   - Added to the "Web" tab header section
   - Added to the "All Results" tab web results section
   - Only shown when web results are available

2. **User Access Control**:
   - Button is only functional for Pro tier users
   - Non-Pro users see a toast notification explaining the feature is premium
   - Button remains visible but with reduced opacity for non-Pro users as a discovery mechanism

3. **Context Preservation**:
   - When transitioning from regular search to deep research, follow-up context is preserved
   - This ensures that any conversational history is maintained across search types

4. **URL Parameter Handling**:
   - Deep research is triggered by adding `deepResearch=true` to the search URL
   - Preserves other relevant parameters like `isFollowUp` for context continuity
   - Uses default research settings initially (iterations=3, includeReasoning=true)

## User Experience

1. **Visual Feedback**:
   - Success toast notification when deep research is initiated
   - Research progress visible in the insights panel that automatically appears
   - Clear visual distinction between deep research results and standard results

2. **Error Handling**:
   - Proper subscription tier checking and notification
   - Graceful handling of authentication state

## Components

1. **DeepResearchButton.tsx**: Button component with subscription checking and navigation logic
2. **SearchTabs.tsx**: Integration of the button within search results tabs
3. **SearchResults.tsx**: Controls visibility of the insights panel during deep research

## Future Enhancements

1. **Custom Settings**: Allow users to specify custom deep research parameters when transitioning
2. **Result Comparison**: Provide comparative view showing standard vs. deep research results
3. **Save Previous State**: Remember previous search state to allow easy switching back and forth
4. **Progress Tracking**: Enhanced progress tracking when switching from standard to deep research mode

## Related Documentation

- See `docs/deepresearch.md` for deep research technical implementation details
- See `docs/contextual-follow-up.md` for information on the follow-up question context system