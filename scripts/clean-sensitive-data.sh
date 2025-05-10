#!/bin/bash

# Script to remove serviceAccountKey.json from Git history
# This uses git filter-branch to completely remove the file from all commits

echo "WARNING: This script will rewrite your Git history!"
echo "It's recommended to backup your repository before proceeding."
echo "This process is destructive and will force push to your repository."
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Operation cancelled."
    exit 1
fi

# Remove the file from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch server/serviceAccountKey.json" \
  --prune-empty --tag-name-filter cat -- --all

# Force garbage collection to remove unreferenced objects
echo "Cleaning up..."
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now

echo
echo "The service account key has been removed from Git history."
echo "You still need to push these changes to remote repositories."
echo
echo "IMPORTANT: This will require a force push to update remote repositories:"
echo "  git push origin --force --all"
echo
echo "Make sure all collaborators are aware of this change, as they will need to:"
echo "  git fetch origin"
echo "  git reset --hard origin/main  # or whatever branch they are on"
echo
echo "NOTE: This script does not push changes. You must manually force push when ready."
