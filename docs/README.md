# MCP Notion Stack Documentation

Welcome to the comprehensive documentation for the MCP Notion Stack. This documentation covers everything you need to know about deploying, developing, and troubleshooting the system.

## 📚 Documentation Structure

### 🚀 Getting Started
- **[Main README](../README.md)** - Project overview and quick start guide
- **[Deployment Guide](deployment/README.md)** - Complete deployment instructions
- **[Environment Setup](deployment/README.md#environment-configuration)** - Configuration and environment variables

### 🔧 Development
- **[Development Guide](development/README.md)** - Development environment and workflow
- **[API Documentation](api/README.md)** - Complete API reference and examples
- **[Code Standards](development/README.md#code-standards)** - Coding guidelines and best practices

### 🛠️ Operations
- **[Troubleshooting Guide](troubleshooting/README.md)** - Common issues and solutions
- **[Monitoring](deployment/README.md#monitoring)** - Health checks and metrics
- **[Security](deployment/README.md#security-configuration)** - Security configuration and best practices

### 📋 Reference
- **[OpenAPI Specification](../openapi-min.yaml)** - Machine-readable API specification
- **[Docker Configuration](../docker-compose.yml)** - Service orchestration
- **[Scripts](../scripts/)** - Utility and testing scripts

## 🎯 Quick Navigation

### For New Users
1. Start with the **[Main README](../README.md)**
2. Follow the **[Deployment Guide](deployment/README.md)**
3. Test with the **[API Documentation](api/README.md)**

### For Developers
1. Read the **[Development Guide](development/README.md)**
2. Understand the **[API Documentation](api/README.md)**
3. Follow **[Code Standards](development/README.md#code-standards)**

### For Operators
1. Review the **[Deployment Guide](deployment/README.md)**
2. Keep the **[Troubleshooting Guide](troubleshooting/README.md)** handy
3. Set up **[Monitoring](deployment/README.md#monitoring)**

## 🔍 What You'll Find Here

### Architecture Overview
- **Dual-MCP Routing**: Intelligent backend selection between official and custom MCP servers
- **Service Architecture**: Docker-based microservices with health monitoring
- **Security**: Authentication, rate limiting, and network isolation
- **Monitoring**: Comprehensive logging, metrics, and health checks

### Key Features
- **ChatGPT Actions Integration**: Full OpenAPI specification for AI tool integration
- **MCP Protocol Support**: Complete Model Context Protocol implementation
- **Production Ready**: Hardened with security, monitoring, and error handling
- **Development Friendly**: Clean development environment with hot reloading

### Use Cases
- **AI Integration**: Connect ChatGPT and other AI tools to Notion
- **Automation**: Programmatic Notion page creation and management
- **API Gateway**: Centralized access to Notion functionality
- **MCP Bridge**: Standardized interface for MCP-compatible tools

## 🚀 Quick Start Commands

```bash
# Clone and setup
git clone <your-repo-url>
cd mcp-notion-stack

# Configure environment
cp headers.env.example headers.env
cp .env.example .env
nano headers.env  # Add your tokens
nano .env         # Add Cloudflare tunnel token

# Start services
docker compose up -d

# Verify deployment
docker compose ps
./scripts/health-check.sh

# Test API
curl -H "Authorization: Bearer $ROUTER_API_KEY" \
  http://localhost:3032/health
```

## 📖 Documentation Standards

### Code Examples
- All examples use real, tested commands
- Environment variables are clearly marked
- Error handling and edge cases are covered

### Structure
- **Progressive disclosure**: Start simple, dive deep
- **Practical focus**: Real-world examples and use cases
- **Cross-references**: Links between related topics
- **Searchable**: Clear headings and consistent formatting

### Maintenance
- Documentation is updated with code changes
- Examples are tested and verified
- Links are regularly checked and updated

## 🤝 Contributing to Documentation

### How to Contribute
1. **Report Issues**: Open GitHub issues for documentation problems
2. **Suggest Improvements**: Propose better examples or explanations
3. **Submit Fixes**: Pull requests for documentation updates
4. **Share Knowledge**: Add troubleshooting tips and solutions

### Documentation Guidelines
- **Clear and Concise**: Use simple, direct language
- **Examples First**: Show before telling
- **Consistent Format**: Follow established patterns
- **Test Everything**: Verify all commands and examples work

## 📞 Getting Help

### Documentation Issues
- Check the **[Troubleshooting Guide](troubleshooting/README.md)**
- Search existing GitHub issues
- Open a new issue with clear details

### Technical Support
- Review the **[Deployment Guide](deployment/README.md)**
- Check service logs and health status
- Use the diagnostic commands in troubleshooting

### Community Resources
- GitHub Discussions
- Docker Community Forums
- Cloudflare Support Documentation

## 🔄 Documentation Updates

### Recent Changes
- **v1.0.0**: Initial comprehensive documentation
- **v1.1.0**: Added troubleshooting and development guides
- **v1.2.0**: Enhanced API documentation and examples

### Upcoming
- Video tutorials and walkthroughs
- Interactive API testing tools
- Performance optimization guides
- Advanced deployment scenarios

## 📊 Documentation Metrics

- **Total Pages**: 6 comprehensive guides
- **Code Examples**: 50+ tested commands
- **Troubleshooting**: 20+ common issues covered
- **API Endpoints**: Complete coverage with examples

---

**Need help?** Start with the [Troubleshooting Guide](troubleshooting/README.md) or check the [GitHub Issues](https://github.com/your-repo/issues) for solutions to common problems.

**Want to contribute?** See our [Contributing Guidelines](../README.md#contributing) and help improve the documentation for everyone!
