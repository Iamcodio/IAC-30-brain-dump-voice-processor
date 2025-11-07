"""
Ollama client for brain dump transcript cleanup.
Local processing, privacy-first, Rogerian approach.
"""

from typing import Optional, Dict
import ollama
from pathlib import Path

from .prompts.rogerian import CLEANUP_PROMPT


class OllamaCleanup:
    """Client for cleaning transcripts using local Ollama."""
    
    def __init__(self, model: str = "llama3.2:latest", timeout: int = 120):
        """
        Initialize Ollama cleanup client.
        
        Args:
            model: Ollama model to use (default: llama3.2:latest)
            timeout: Request timeout in seconds (default: 120 for long transcripts)
        """
        self.model = model
        self.timeout = timeout
        self._verify_connection()
    
    def _verify_connection(self) -> None:
        """Verify Ollama is running and model is available."""
        try:
            response = ollama.list()
            
            # Extract available models
            if hasattr(response, 'models'):
                available = [m.model for m in response.models]
            elif isinstance(response, dict) and 'models' in response:
                available = [m.get('name', m.get('model', '')) for m in response['models']]
            else:
                available = []
            
            print(f"Available Ollama models: {available}")
            
            # Check if our model exists
            model_found = any(self.model in m for m in available)
            
            if not model_found:
                raise ConnectionError(
                    f"Model {self.model} not found. "
                    f"Available: {available}\n"
                    f"Run: ollama pull {self.model}"
                )
                
        except Exception as e:
            raise ConnectionError(
                f"Cannot connect to Ollama: {e}\n"
                f"Make sure Ollama is running."
            )
    
    def cleanup_transcript(
        self,
        raw_transcript: str,
        custom_options: Optional[Dict] = None
    ) -> str:
        """
        Clean up raw transcript using Rogerian approach.
        
        Args:
            raw_transcript: Raw transcript text from Whisper
            custom_options: Optional Ollama generation options
            
        Returns:
            Cleaned markdown text
        """
        if not raw_transcript.strip():
            return ""
        
        # Build full prompt
        full_prompt = f"{CLEANUP_PROMPT}\n\n{raw_transcript}"
        
        # M2-optimized settings
        options = {
            'temperature': 0.7,
            'num_predict': 4000,
            'top_k': 40,
            'top_p': 0.9,
            'repeat_penalty': 1.1,
            'num_thread': 8,
        }
        
        if custom_options:
            options.update(custom_options)
        
        try:
            print(f"Processing with Ollama ({self.model})...")
            print(f"Input length: {len(raw_transcript)} chars")
            
            response = ollama.generate(
                model=self.model,
                prompt=full_prompt,
                options=options
            )
            
            cleaned = response['response'].strip()
            
            print(f"Output length: {len(cleaned)} chars")
            print("✓ Cleanup complete")
            
            return cleaned
            
        except Exception as e:
            raise RuntimeError(f"Ollama processing failed: {e}")
    
    def cleanup_file(
        self,
        input_path: str,
        output_path: Optional[str] = None
    ) -> str:
        """
        Clean up transcript from file and save result.
        
        Args:
            input_path: Path to raw transcript file
            output_path: Optional output path (defaults to input_path + '_clean.md')
            
        Returns:
            Path to output file
        """
        input_file = Path(input_path)
        
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        raw_text = input_file.read_text(encoding='utf-8')
        cleaned = self.cleanup_transcript(raw_text)
        
        if output_path is None:
            output_path = input_file.parent / f"{input_file.stem}_clean.md"
        else:
            output_path = Path(output_path)
        
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        
        metadata = f"""# Brain Dump - Cleaned Transcript
**Processed:** {timestamp}
**Source:** {input_file.name}
**Model:** {self.model}
**Approach:** Rogerian (non-judgmental reflection)

---

"""
        
        final_output = metadata + cleaned
        output_path.write_text(final_output, encoding='utf-8')
        
        print(f"✓ Saved to: {output_path}")
        
        return str(output_path)
