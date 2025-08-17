# We would like to use Alpine, but node requires glibc, and alpine doesn't have it.
FROM ubuntu:latest

# Install dependencies for testing and multiple Node versions
RUN apt-get update && apt-get install -y \
    bash \
    curl \
    git \
    make \
    python3 \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create a test user
RUN useradd -m -s /bin/bash testuser

# Switch to test user
USER testuser
WORKDIR /home/testuser

# Create bash profile for nvm
RUN touch /home/testuser/.bashrc

# Install nvm for managing multiple Node versions
ENV NVM_DIR /home/testuser/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Add nvm to PATH for subsequent RUN commands
SHELL ["/bin/bash", "-c"]

# Source nvm and pre-install some Node versions to speed up tests and cache the test host image.
RUN source $NVM_DIR/nvm.sh && \
    nvm install 18 && \
    nvm install 20 && \
    nvm install 22 && \
    nvm alias default 18

# Copy the package tarball, package.json, and test scripts
COPY --chown=testuser:testuser comply-server-*.tgz /home/testuser/
COPY --chown=testuser:testuser package.json /home/testuser/
COPY --chown=testuser:testuser test/*.js test/*.sh /home/testuser/test/

# Make test scripts executable
RUN chmod +x /home/testuser/test/*.sh

# Set working directory
WORKDIR /home/testuser

# The entrypoint will be our test runner script
ENTRYPOINT ["/bin/bash", "/home/testuser/test/run-tests.sh"]