const fs = require('fs');
const file = 'frontend/src/components/ui/PreviousContactsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the bad syntax start
const badStart = `              ) : (
                
              {isMyTab && (`;
const goodStart = `              ) : (
                <div className="flex flex-col w-full">
                  {isMyTab && (`;

content = content.replace(badStart, goodStart);

// Now we need to close that div right before {/* Pagination Controls */}
const badEnd = `              </div>
            )}

            {/* Pagination Controls */}`;
const goodEnd = `              </div>
                </div>
            )}

            {/* Pagination Controls */}`;

content = content.replace(badEnd, goodEnd);

fs.writeFileSync(file, content, 'utf8');
