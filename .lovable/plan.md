

# Compress Phase 1 to 4 Weeks

## What's Changing

- **Phase 1**: Compressed from 8 weeks → 4 weeks (Weeks 1-4)
- **Phase 2**: Stays 6 weeks, shifted to Weeks 5-10
- **Total project**: 14 weeks → 10 weeks

## Updated Timeline

### Phase 1: VisiGuard Deployment (Weeks 1-4)
| Week | Tasks |
|------|-------|
| 1 | Discovery, requirements gathering, infrastructure setup |
| 2 | Location/gate/department config, site deployment |
| 3 | User training, UAT & issue fixing |
| 4 | Go-live & hypercare start |

### Phase 2: ANPR Integration (Weeks 5-10) — unchanged content
| Week | Tasks |
|------|-------|
| 5 | Hardware procurement & site survey |
| 6 | Camera installation & networking |
| 7 | ANPR software config & AI model setup |
| 8 | Integration testing & calibration |
| 9 | Pilot run & fine-tuning |
| 10 | Full ANPR go-live & handover |

## Files to Update

1. **Excel** (`VisiGuard_Implementation_Gantt_v3.xlsx`) — Gantt chart columns reduced to 10 weeks, task rows updated, Sheet 2 task details updated
2. **Word** (`VisiGuard_Implementation_Timeline_v3.docx`) — Phase 1 table compressed to 4 weeks, Phase 2 shifted, summary stats updated (10 weeks total)

## Technical Approach
- Update Python script for Excel generation with new week ranges and 10-column Gantt
- Update Node.js script for Word generation with compressed Phase 1 tasks
- Output as v3 files to `/mnt/documents/`
- QA via image conversion

