# Ollama Voice Processing Configuration

## Overview

This document explains how to configure the MCP AI Workbench to use local Ollama models for voice processing instead of cloud-based AI providers like Anthropic, OpenAI, or Google.

## Benefits of Using Ollama for Voice Processing

### ✅ **Privacy & Security**
- **Local processing**: All voice corrections happen on your local machine
- **No data transmission**: Speech text never leaves your computer
- **Complete privacy**: No cloud providers see your voice transcriptions

### ✅ **Performance**
- **Faster processing**: No network latency for AI corrections
- **Offline capability**: Works without internet connection
- **Consistent speed**: Not affected by cloud provider rate limits

### ✅ **Cost Efficiency**
- **No API costs**: Eliminate per-request charges from cloud providers
- **Unlimited usage**: Process as much voice input as needed
- **Resource control**: Use your own hardware resources

## Prerequisites

### 1. Install Ollama
Download and install Ollama from: https://ollama.ai/

### 2. Install a Suitable Model
For voice processing, we recommend fast, efficient models:

```bash
# Install Llama 3.2 (recommended for voice processing)
ollama pull llama3.2:latest

# Alternative models for different performance needs
ollama pull llama3.2:1b    # Fastest, lower quality
ollama pull llama3.2:3b    # Balanced speed/quality
ollama pull llama3.2:7b    # Higher quality, slower
ollama pull qwen2.5:latest # Alternative high-performance model
```

### 3. Verify Ollama is Running
```bash
# Check if Ollama is running
ollama list

# Start Ollama service if needed
ollama serve
```

## Configuration Steps

### 1. ✅ **Updated Voice Processing Service**
The voice processing service has been configured to prioritize Ollama:

```typescript
// Provider priority order (Ollama first)
const preferredProviders = [
  "ollama",           // Local Ollama models (highest priority)
  "google",           // Fallback: Google Gemini
  "deepseek",         // Fallback: DeepSeek
  "openai",           // Fallback: OpenAI
  "anthropic"         // Fallback: Anthropic Claude
];
```

### 2. ✅ **Updated AI Preferences**
The system preferences have been set to use Ollama by default:

```json
{
  "provider": "ollama",
  "model": "llama3.2:latest",
  "timestamp": 1748589945063
}
```

### 3. ✅ **Environment Configuration**
Created `.env` file in backend with Ollama configuration:

```env
# Primary AI Provider
DEFAULT_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest

# Voice Processing Specific
VOICE_PROCESSING_PROVIDER=ollama
VOICE_PROCESSING_MODEL=llama3.2:latest
VOICE_PROCESSING_TIMEOUT=10000
```

## Model Recommendations for Voice Processing

### **Recommended: llama3.2:latest**
- **Size**: ~2GB
- **Speed**: Fast processing for real-time corrections
- **Quality**: Good grammar and punctuation correction
- **Memory**: Moderate RAM usage

### **Alternative Models**

#### **For Maximum Speed: llama3.2:1b**
```bash
ollama pull llama3.2:1b
```
- **Size**: ~1GB
- **Speed**: Fastest processing
- **Quality**: Basic corrections
- **Use case**: Low-end hardware or maximum speed priority

#### **For Best Quality: llama3.2:7b**
```bash
ollama pull llama3.2:7b
```
- **Size**: ~4GB
- **Speed**: Slower processing
- **Quality**: Excellent corrections
- **Use case**: High-end hardware with quality priority

#### **Alternative: qwen2.5:latest**
```bash
ollama pull qwen2.5:latest
```
- **Size**: ~4GB
- **Speed**: Good performance
- **Quality**: Excellent language understanding
- **Use case**: Alternative to Llama models

## Configuration Options

### Environment Variables

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434    # Ollama server URL
OLLAMA_MODEL=llama3.2:latest              # Default Ollama model

# Voice Processing Configuration
VOICE_PROCESSING_PROVIDER=ollama          # Primary provider for voice
VOICE_PROCESSING_MODEL=llama3.2:latest    # Model for voice processing
VOICE_PROCESSING_TIMEOUT=10000            # Timeout in milliseconds

# Fallback Providers (optional)
GOOGLE_API_KEY=your_google_key            # Fallback if Ollama fails
OPENAI_API_KEY=your_openai_key            # Fallback if Ollama fails
```

### Model Selection

To change the model used for voice processing:

1. **Install the desired model**:
   ```bash
   ollama pull your-preferred-model
   ```

2. **Update environment variable**:
   ```env
   VOICE_PROCESSING_MODEL=your-preferred-model
   ```

3. **Or update AI preferences**:
   ```json
   {
     "provider": "ollama",
     "model": "your-preferred-model"
   }
   ```

## Troubleshooting

### Issue: "Ollama not available"

**Solution**:
1. Verify Ollama is installed and running:
   ```bash
   ollama list
   ```

2. Check if Ollama service is running:
   ```bash
   ollama serve
   ```

3. Verify the base URL is correct:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### Issue: Voice processing is slow

**Solutions**:
1. **Use a smaller model**:
   ```bash
   ollama pull llama3.2:1b
   ```

2. **Increase timeout**:
   ```env
   VOICE_PROCESSING_TIMEOUT=15000
   ```

3. **Check system resources**: Ensure sufficient RAM and CPU

### Issue: Poor correction quality

**Solutions**:
1. **Use a larger model**:
   ```bash
   ollama pull llama3.2:7b
   ```

2. **Try alternative models**:
   ```bash
   ollama pull qwen2.5:latest
   ```

### Issue: Fallback to cloud providers

**Check logs** for provider selection:
```
[Voice Processing] Attempting to use ollama with model: llama3.2:latest
[Voice Processing] Successfully used ollama for voice correction
```

If you see fallback messages, check Ollama availability.

## Performance Optimization

### Hardware Recommendations

#### **Minimum Requirements**
- **RAM**: 4GB available
- **CPU**: Modern multi-core processor
- **Model**: llama3.2:1b or llama3.2:3b

#### **Recommended Setup**
- **RAM**: 8GB+ available
- **CPU**: 8+ cores
- **Model**: llama3.2:latest or llama3.2:7b

#### **High-Performance Setup**
- **RAM**: 16GB+ available
- **CPU**: 16+ cores or GPU acceleration
- **Model**: llama3.2:7b or qwen2.5:latest

### Optimization Tips

1. **Close unnecessary applications** to free up RAM
2. **Use SSD storage** for faster model loading
3. **Enable GPU acceleration** if available (CUDA/Metal)
4. **Monitor resource usage** during voice processing

## Verification

### Test Voice Processing
1. Start the MCP AI Workbench
2. Use voice input feature
3. Check backend logs for:
   ```
   [Voice Processing] Attempting to use ollama with model: llama3.2:latest
   [Voice Processing] Successfully used ollama for voice correction
   ```

### Monitor Performance
- **Response time**: Should be < 2 seconds for most corrections
- **CPU usage**: Monitor during voice processing
- **Memory usage**: Ensure sufficient RAM available

## Security Benefits

### Data Privacy
- **Local processing**: Voice text never transmitted to external servers
- **No logging**: Cloud providers don't log your voice corrections
- **Complete control**: You control all data processing

### Network Security
- **Offline capability**: Works without internet connection
- **No external dependencies**: Reduces attack surface
- **Local infrastructure**: No reliance on external services

## Conclusion

Using Ollama for voice processing provides:

### ✅ **Enhanced Privacy**
- Complete local processing
- No data transmission to cloud providers
- Full control over voice correction data

### ✅ **Improved Performance**
- Faster processing without network latency
- Consistent performance regardless of internet speed
- No rate limiting from cloud providers

### ✅ **Cost Efficiency**
- No per-request API charges
- Unlimited voice processing
- One-time setup cost only

### ✅ **Reliability**
- Works offline
- No dependency on external services
- Consistent availability

The configuration is now complete and the system will automatically use your local Ollama models for all voice processing tasks while maintaining fallback options for reliability.
