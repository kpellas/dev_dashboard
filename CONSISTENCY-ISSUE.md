# Dashboard Consistency Issue

## Problem
Code improvements have been made directly to individual project dashboards instead of the central `dev-dashboard`, creating inconsistencies across projects.

## Examples Found
- Port allocation fixes (commit 76cf702) were in some projects but not others
- Session management improvements varied between projects
- Script generation had different versions

## Root Cause
Developers have been fixing issues in their local project dashboards instead of updating the master `dev-dashboard` that should be the single source of truth.

## Solution Required
1. **Immediate**: Merge all improvements from individual projects back to `dev-dashboard`
2. **Process**: All dashboard improvements MUST go through `dev-dashboard` first
3. **Sync**: Create a sync mechanism or script to update all projects from master

## Affected Files (found in this session)
- `session-enhanced.js` - Had different versions
- `session-auto-verify.js` - Missing in some projects  
- `session-verification.js` - Had outdated port handling
- `server.js` - Port allocation logic varied

## Action Items
- [ ] Audit all project dashboards for unique improvements
- [ ] Merge all improvements back to dev-dashboard
- [ ] Create sync script to push dev-dashboard updates to all projects
- [ ] Document that dev-dashboard is the single source of truth
- [ ] Add pre-commit hook to warn if editing dashboard files in project repos

## Impact
This inconsistency causes:
- Bugs fixed in one project reappear in others
- Wasted time re-fixing the same issues
- Confusion about which version is "correct"
- Difficult to maintain and update

## Prevention
- Clear documentation that `dev-dashboard` is the master
- Automated sync process
- Code review should catch dashboard edits in project repos
- Consider making dashboard files symlinks to dev-dashboard