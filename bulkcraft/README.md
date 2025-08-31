# BulkCraft - AI-Powered Viral Twitter Content Generator

Generate viral Twitter content using AI analysis of your historical performance data and psychological engagement strategies.

## Features

- **CSV Analysis**: Analyze Twitter export data to identify viral patterns
- **AI Generation**: Create optimized content using OpenRouter LLMs
- **Trend Research**: Research current viral trends and topics
- **Competitor Analysis**: Analyze successful accounts for strategies
- **Psychology-Based**: Apply psychological triggers for engagement
- **Content Controls**: Fine-tune length, tone, style, and keywords
- **Viral Prediction**: Score content for viral potential

## Installation

```bash
npm install
npm run build
```

## Configuration

1. Copy `.env.example` to `.env`
2. Add your OpenRouter API key
3. Adjust settings as needed

## Usage

### Analyze Your Twitter Data

```bash
# Basic analysis
bulkcraft analyze account_analytics.csv

# Detailed analysis with viral formula
bulkcraft analyze account_analytics.csv --verbose

# Save analysis to file
bulkcraft analyze account_analytics.csv --output analysis.json
```

### Generate Viral Content

```bash
# Basic generation
bulkcraft generate --topic "AI tools"

# Reply generation with style
bulkcraft generate --reply-to "AI will replace developers" --style confrontational --tone sarcastic

# Multiple variations
bulkcraft generate --topic "startup life" --variations 3

# With psychological triggers
bulkcraft generate --topic "productivity" --psychology scarcity --audience entrepreneurs

# Using analysis context
bulkcraft generate --with-analysis data.csv --topic "coding"
```

### Research Trends

```bash
# Research trending topics
bulkcraft research --trends "AI development" --depth 20

# Analyze competitor
bulkcraft research --competitor elonmusk --depth 50

# Generate viral hooks
bulkcraft research --hooks "machine learning" --style controversial
```

### Test Connection

```bash
bulkcraft test
```

## Architecture

```
src/
├── analysis/       # CSV parsing and metrics
├── llm/           # OpenRouter integration
├── generation/    # Content generation engine
├── research/      # Trend and competitor research
├── psychology/    # Viral psychology strategies
├── controls/      # Content control systems
└── cli/          # Command-line interface
```

## Content Strategy

Based on analysis, viral content follows this formula:
- **Reply posts** get 15x more impressions
- **Controversial takes** drive reach
- **Technical content** gets high engagement
- **Optimal length**: 200-280 characters
- **Direct confrontational language** performs best

## License

MIT