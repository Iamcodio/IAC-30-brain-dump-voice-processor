"""
Simple transcript cleanup - no analysis, just cleaning.
"""

CLEANUP_PROMPT = """Clean this voice transcript by:
1. Remove ALL timestamps like [00:00:10.440 --> 00:00:15.620]
2. Remove filler words: um, uh, like, you know, so, basically
3. Fix obvious repetitions: "you're, you're, you're" becomes "you're"
4. Add paragraph breaks at natural pauses (every 5-8 sentences)
5. Keep EVERYTHING ELSE exactly as spoken
6. Do NOT summarize, analyze, or change meaning
7. Output ONLY the cleaned text, nothing else

Transcript:"""
