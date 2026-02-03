#!/bin/bash

# Define the service directories to check
services_dirs=("email" "exports" "form" "frontend" "projects" "uploads" "users" "utilities" "events" "database")
services_with_changes=()

# Check each service directory for git changes
for service in "${services_dirs[@]}"; do
    service_path="$CLAUDE_PROJECT_DIR/$service"

    # Check if directory exists and is a git repo
    if [ -d "$service_path" ] && [ -d "$service_path/.git" ]; then
        # Check for changes in this specific repo
        cd "$service_path"
        git_status=$(git status --porcelain 2>/dev/null)

        if [ -n "$git_status" ]; then
            services_with_changes+=("$service")
        fi
    fi
done

# Return to original directory
cd "$CLAUDE_PROJECT_DIR"

if [[ ${#services_with_changes[@]} -gt 0 ]]; then
    services_list=$(IFS=', '; echo "${services_with_changes[*]}")
    echo "Changes detected in: $services_list — triggering build-error-resolver..." >&2

    if command -v claude >/dev/null 2>&1; then
        claude --agent build-error-resolver <<EOF 2>/dev/null
Build and fix errors in these specific services only: ${services_list}

Focus on these services in the monorepo structure. Each service has its own build process.
EOF

        if [ $? -ne 0 ]; then
            claude chat "Use the build-error-resolver agent to build and fix errors in: ${services_list}" 2>/dev/null
        fi
    fi
else
    echo "No services with changes detected — skipping build-error-resolver." >&2
fi

exit 0
