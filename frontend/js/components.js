const components = {
    renderDashboard(stats, projects) {
        const myTasks = projects.filter(p => 
            p.currentStage && 
            p.currentStage.assignedTo?._id === auth.currentUser._id && 
            p.status === 'جاري'
        );

        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="card text-center">
                    <p class="text-4xl font-black text-primary">${stats.myTasks}</p>
                    <p class="text-gray-500 mt-2">مهامي الحالية</p>
                </div>
                <div class="card text-center">
                    <p class="text-4xl font-black text-yellow-500">${stats.upcomingTasks}</p>
                    <p class="text-gray-500 mt-2">مهام قريبة</p>
                </div>
                <div class="card text-center">
                    <p class="text-4xl font-black text-red-500">${stats.overdueTasks}</p>
                    <p class="text-gray-500 mt-2">مهام متأخرة</p>
                </div>
                <div class="card text-center">
                    <p class="text-4xl font-black text-green-500">${stats.completedThisMonth}</p>
                    <p class="text-gray-500 mt-2">مكتمل هذا الشهر</p>
                </div>
            </div>
            <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card">
                    <h3 class="font-bold text-lg mb-4">المهام القادمة</h3>
                    <div class="space-y-4">
                        ${myTasks.slice(0, 5).map(p => `
                            <div class="flex justify-between items-center">
                                <div>
                                    <p class="font-bold">${p.currentStage.name}</p>
                                    <p class="text-sm text-muted">${p.name}</p>
                                </div>
                                <p class="text-sm font-bold">${utils.formatDate(p.currentStage.stageDeadline)}</p>
                            </div>
                        `).join('') || '<p class="text-muted">لا توجد مهام قادمة.</p>'}
                    </div>
                </div>
                <div class="card">
                    <h3 class="font-bold text-lg mb-4">النشاط الأخير</h3>
                    <p class="text-muted">سيتم إضافة النشاط قريبًا.</p>
                </div>
            </div>
        `;
    },

    renderProjectsTable(projects) {
        if (projects.length === 0) {
            return '<div class="card">لا توجد مشاريع حاليًا.</div>';
        }

        return `
            <div class="card overflow-x-auto">
                <table class="w-full text-right">
                    <thead>
                        <tr class="border-b">
                            <th class="p-4">اسم المشروع</th>
                            <th class="p-4">العميل</th>
                            <th class="p-4">الحالة</th>
                            <th class="p-4">التقدم</th>
                            <th class="p-4">الموعد النهائي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projects.map(p => {
                            const progress = p.totalStages > 0 
                                ? (p.completedStages.length / p.totalStages * 100).toFixed(0) 
                                : 0;
                            const statusColors = {
                                'مكتمل': 'bg-green-500',
                                'جاري': 'bg-blue-500',
                                'متأخر': 'bg-red-500'
                            };
                            return `
                                <tr class="border-b hover:bg-gray-50 cursor-pointer project-row" data-project-id="${p._id}">
                                    <td class="p-4 font-bold">${p.name}</td>
                                    <td class="p-4">${p.clientId?.name || 'N/A'}</td>
                                    <td class="p-4">
                                        <span class="badge ${statusColors[p.status] || 'bg-yellow-500'}">${p.status}</span>
                                    </td>
                                    <td class="p-4">
                                        <div class="w-full bg-gray-200 rounded-full h-2.5">
                                            <div class="bg-primary h-2.5 rounded-full" style="width: ${progress}%"></div>
                                        </div>
                                    </td>
                                    <td class="p-4">${utils.formatDate(p.projectDeadline)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderProjectTimeline(project) {
        const allStages = [
            ...project.completedStages,
            ...(project.currentStage ? [project.currentStage] : []),
            ...project.workflow
        ];

        return `
            <div class="timeline">
                ${allStages.map(stage => {
                    const isCompleted = project.completedStages.some(s => s._id === stage._id);
                    const isActive = project.currentStage && project.currentStage._id === stage._id;
                    
                    let itemClass = '';
                    let icon = 'fa-hourglass-half';
                    
                    if (isCompleted) {
                        itemClass = 'completed';
                        icon = 'fa-check';
                    }
                    if (isActive) {
                        itemClass = 'active';
                        icon = 'fa-cogs';
                        if (stage.status === 'يحتاج تعديل') icon = 'fa-exclamation-triangle';
                        if (stage.status === 'مراجعة') icon = 'fa-search';
                    }

                    return `
                        <div class="timeline-item ${itemClass}">
                            <div class="timeline-dot">
                                <i class="fas ${icon}"></i>
                            </div>
                            <div class="timeline-content">
                                <p class="font-bold">${stage.name}</p>
                                <p class="text-sm text-muted">${stage.assignedTo?.name || 'N/A'}</p>
                                <p class="text-xs font-bold">${utils.formatDate(stage.stageDeadline)}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderTeamMembers(users, roles) {
        return `
            <div class="card overflow-x-auto">
                <table class="w-full text-right">
                    <thead>
                        <tr class="border-b">
                            <th class="p-4">الاسم</th>
                            <th class="p-4">البريد الإلكتروني</th>
                            <th class="p-4">الدور الوظيفي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr class="border-b">
                                <td class="p-4 flex items-center">
                                    ${user.avatar 
                                        ? `<img src="${user.avatar}" class="w-10 h-10 rounded-full object-cover">`
                                        : `<div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style="background-color: ${utils.generateAvatarColor(user.name)}">${utils.getInitials(user.name).toUpperCase()}</div>`
                                    }
                                    <span class="mr-3 font-semibold">${user.name}</span>
                                </td>
                                <td class="p-4 text-muted">${user.email}</td>
                                <td class="p-4 font-semibold">${user.roleId?.name || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
};