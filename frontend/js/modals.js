window.showProjectModal = async function(projectId = null) {
    const modal = utils.getEl('project-modal');
    const form = utils.getEl('project-form');
    const clients = await api.getClients();
    const users = await api.getUsers();
    const departments = await api.getDepartments();
    
    let existingProject = null;
    if (projectId) {
        existingProject = await api.getProject(projectId);
        utils.getEl('project-modal-title').textContent = 'تعديل المشروع';
    } else {
        utils.getEl('project-modal-title').textContent = 'مشروع جديد';
    }

    form.innerHTML = `
        <input type="hidden" id="project-id" value="${projectId || ''}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-bold">اسم المشروع</label>
                <input type="text" id="project-name" class="form-input" required value="${existingProject?.name || ''}">
            </div>
            <div>
                <label class="block text-sm font-bold">العميل</label>
                <select id="project-client" class="form-select" required>
                    ${clients.map(c => `
                        <option value="${c._id}" ${existingProject?.clientId?._id === c._id ? 'selected' : ''}>
                            ${c.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-bold">الموعد النهائي</label>
                <input type="date" id="project-deadline" class="form-input" required 
                    value="${existingProject ? existingProject.projectDeadline.split('T')[0] : ''}">
            </div>
            <div>
                <label class="block text-sm font-bold">نوع المشروع</label>
                <select id="project-type" class="form-select" required>
                    <option value="one-time" ${existingProject?.projectType === 'one-time' ? 'selected' : ''}>
                        مشروع لمرة واحدة
                    </option>
                    <option value="subscription" ${existingProject?.projectType === 'subscription' ? 'selected' : ''}>
                        اشتراك شهري
                    </option>
                    <option value="maintenance" ${existingProject?.projectType === 'maintenance' ? 'selected' : ''}>
                        صيانة دورية
                    </option>
                </select>
            </div>
        </div>
        <div>
            <label class="block text-sm font-bold mt-2">وصف المشروع (Brief)</label>
            <textarea id="project-description" class="form-textarea" rows="4">${existingProject?.projectDescription || ''}</textarea>
        </div>
        <div>
            <label class="block text-sm font-bold mt-4">مراحل المشروع</label>
            <div id="project-stages-container" class="space-y-2 mt-2 bg-gray-50 p-4 rounded-lg"></div>
            <button type="button" id="add-stage-btn" class="btn mt-2 w-full">
                <i class="fas fa-plus mr-2"></i>إضافة مرحلة
            </button>
        </div>
        <div class="flex justify-end pt-4">
            <button type="button" class="btn ml-2" onclick="app.closeModal('project-modal')">إلغاء</button>
            <button type="submit" class="btn btn-primary">حفظ</button>
        </div>
    `;

    const addStageToForm = (stageData = null) => {
        const container = utils.getEl('project-stages-container');
        const stageId = `stage_${Date.now()}`;
        const div = document.createElement('div');
        div.className = 'p-2 border rounded-lg flex items-center gap-2 bg-white draggable-stage';
        div.setAttribute('draggable', 'true');
        div.id = stageId;
        
        div.innerHTML = `
            <i class="fas fa-grip-vertical cursor-move text-gray-400"></i>
            <input type="text" class="form-input flex-grow stage-name-input" 
                placeholder="مرحلة 1: التصميم" required value="${stageData?.name || ''}">
            <select class="form-select w-1/4 stage-dept-select">
                <option value="">اختر القسم</option>
                ${departments.map(d => `
                    <option value="${d._id}">${d.name}</option>
                `).join('')}
            </select>
            <select class="form-select w-1/4 stage-user-select" required>
                <option value="">اختر المسؤول</option>
                ${users.map(u => `
                    <option value="${u._id}" ${stageData?.assignedTo?._id === u._id ? 'selected' : ''}>
                        ${u.name}
                    </option>
                `).join('')}
            </select>
            <input type="date" class="form-input w-1/4 stage-deadline-input" required 
                value="${stageData ? stageData.stageDeadline?.split('T')[0] : ''}">
            <button type="button" class="text-red-500 hover:text-red-700 remove-stage-btn">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        container.appendChild(div);
        
        div.querySelector('.remove-stage-btn').onclick = () => div.remove();
        
        const deptSelect = div.querySelector('.stage-dept-select');
        const userSelect = div.querySelector('.stage-user-select');
        
        deptSelect.onchange = async () => {
            const deptId = deptSelect.value;
            if (deptId) {
                const roles = await api.getRoles();
                const deptRoles = roles.filter(r => r.departmentId === deptId);
                const deptUsers = users.filter(u => deptRoles.some(r => r._id === u.roleId?._id));
                
                userSelect.innerHTML = '<option value="">اختر المسؤول</option>' + 
                    deptUsers.map(u => `<option value="${u._id}">${u.name}</option>`).join('');
            }
        };
    };

    utils.getEl('add-stage-btn').onclick = () => addStageToForm();

    if (existingProject) {
        const allStages = [
            ...existingProject.completedStages,
            ...(existingProject.currentStage ? [existingProject.currentStage] : []),
            ...existingProject.workflow
        ];
        allStages.forEach(stage => addStageToForm(stage));
    } else {
        addStageToForm();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    form.onsubmit = async (e) => {
        e.preventDefault();
        await handleProjectSubmit();
    };

    const handleProjectSubmit = async () => {
        const stageItems = Array.from(document.querySelectorAll('#project-stages-container .draggable-stage'));
        const workflow = stageItems.map(item => ({
            name: item.querySelector('.stage-name-input').value,
            assignedTo: item.querySelector('.stage-user-select').value,
            stageDeadline: item.querySelector('.stage-deadline-input').value
        }));

        const projectData = {
            name: utils.getEl('project-name').value,
            clientId: utils.getEl('project-client').value,
            projectType: utils.getEl('project-type').value,
            projectDeadline: utils.getEl('project-deadline').value,
            projectDescription: utils.getEl('project-description').value,
            workflow: workflow
        };

        try {
            if (projectId) {
                await api.updateProject(projectId, projectData);
                utils.showSuccess('تم تحديث المشروع بنجاح');
            } else {
                await api.createProject(projectData);
                utils.showSuccess('تم إنشاء المشروع بنجاح');
            }
            app.closeModal('project-modal');
            await app.navigateTo(projectId ? 'project-details' : 'projects', 
                projectId ? { projectId } : {});
        } catch (error) {
            utils.showError('حدث خطأ في حفظ المشروع');
        }
    };
};

window.showAddClientModal = function() {
    const modal = utils.getEl('add-client-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    utils.getEl('add-client-form').onsubmit = async (e) => {
        e.preventDefault();
        const clientData = {
            name: utils.getEl('client-name').value,
            contact: utils.getEl('client-contact').value
        };
        
        try {
            await api.createClient(clientData);
            utils.showSuccess('تم إضافة العميل بنجاح');
            app.closeModal('add-client-modal');
            await app.renderClients();
        } catch (error) {
            utils.showError('حدث خطأ في إضافة العميل');
        }
    };
};

window.showUserModal = async function() {
    const modal = utils.getEl('add-user-modal');
    const roles = await api.getRoles();
    
    utils.getEl('user-role').innerHTML = roles.map(r => 
        `<option value="${r._id}">${r.name}</option>`
    ).join('');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    utils.getEl('add-user-form').onsubmit = async (e) => {
        e.preventDefault();
        const userData = {
            name: utils.getEl('user-name').value,
            email: utils.getEl('user-email').value,
            password: utils.getEl('user-password').value,
            roleId: utils.getEl('user-role').value
        };
        
        try {
            await api.createUser(userData);
            utils.showSuccess('تم إضافة المستخدم بنجاح');
            app.closeModal('add-user-modal');
            await app.renderTeam();
        } catch (error) {
            utils.showError(error.message || 'حدث خطأ في إضافة المستخدم');
        }
    };
};

window.showRoleModal = async function(roleId = null) {
    const modal = utils.getEl('add-role-modal');
    const form = utils.getEl('add-role-form');
    const departments = await api.getDepartments();
    
    form.reset();
    utils.getEl('role-id').value = roleId || '';
    
    if (roleId) {
        const roles = await api.getRoles();
        const role = roles.find(r => r._id === roleId);
        utils.getEl('role-modal-title').textContent = 'تعديل الدور';
        utils.getEl('role-name').value = role.name;
        
        for (const perm in role.permissions) {
            const checkbox = utils.getEl(`perm-${perm}`);
            if (checkbox) checkbox.checked = role.permissions[perm];
        }
    } else {
        utils.getEl('role-modal-title').textContent = 'إضافة دور جديد';
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const roleData = {
            name: utils.getEl('role-name').value,
            permissions: {
                canSeeAllProjects: utils.getEl('perm-canSeeAllProjects').checked,
                canAddProject: utils.getEl('perm-canAddProject').checked,
                canAddClient: utils.getEl('perm-canAddClient').checked,
                canApproveStages: utils.getEl('perm-canApproveStages').checked,
                canManageTeam: utils.getEl('perm-canManageTeam').checked,
                canSeeReports: utils.getEl('perm-canSeeReports').checked,
                canManageSales: utils.getEl('perm-canManageSales').checked
            }
        };
        
        try {
            if (roleId) {
                await api.updateRole(roleId, roleData);
                utils.showSuccess('تم تحديث الدور بنجاح');
            } else {
                await api.createRole(roleData);
                utils.showSuccess('تم إضافة الدور بنجاح');
            }
            app.closeModal('add-role-modal');
            await app.renderSettings();
        } catch (error) {
            utils.showError('حدث خطأ في حفظ الدور');
        }
    };
};

window.showLeadModal = function() {
    const modal = utils.getEl('lead-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    utils.getEl('lead-form').onsubmit = async (e) => {
        e.preventDefault();
        const leadData = {
            name: utils.getEl('lead-name').value,
            source: utils.getEl('lead-source').value,
            notes: utils.getEl('lead-notes').value
        };
        
        try {
            await api.createLead(leadData);
            utils.showSuccess('تم إضافة العميل المحتمل بنجاح');
            app.closeModal('lead-modal');
            await app.renderLeads();
        } catch (error) {
            utils.showError('حدث خطأ في إضافة العميل المحتمل');
        }
    };
};

window.showOpportunityModal = async function() {
    const modal = utils.getEl('opportunity-modal');
    const clients = await api.getClients();
    
    utils.getEl('opportunity-client').innerHTML = clients.map(c => 
        `<option value="${c._id}">${c.name}</option>`
    ).join('');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    utils.getEl('opportunity-form').onsubmit = async (e) => {
        e.preventDefault();
        const oppData = {
            name: utils.getEl('opportunity-name').value,
            clientId: utils.getEl('opportunity-client').value,
            value: utils.getEl('opportunity-value').value
        };
        
        try {
            await api.createOpportunity(oppData);
            utils.showSuccess('تم إضافة الفرصة بنجاح');
            app.closeModal('opportunity-modal');
            await app.renderOpportunities();
        } catch (error) {
            utils.showError('حدث خطأ في إضافة الفرصة');
        }
    };
};

window.showInvoiceModal = async function() {
    const modal = utils.getEl('invoice-modal');
    const projects = await api.getProjects();
    
    utils.getEl('invoice-project').innerHTML = projects.map(p => 
        `<option value="${p._id}">${p.name}</option>`
    ).join('');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    utils.getEl('invoice-form').onsubmit = async (e) => {
        e.preventDefault();
        const invoiceData = {
            projectId: utils.getEl('invoice-project').value,
            amount: utils.getEl('invoice-amount').value,
            issueDate: utils.getEl('invoice-issue-date').value,
            dueDate: utils.getEl('invoice-due-date').value
        };
        
        try {
            await api.createInvoice(invoiceData);
            utils.showSuccess('تم إنشاء الفاتورة بنجاح');
            app.closeModal('invoice-modal');
            await app.renderInvoices();
        } catch (error) {
            utils.showError('حدث خطأ في إنشاء الفاتورة');
        }
    };
};

window.showSubmitTaskModal = function(projectId) {
    const modal = utils.getEl('submit-task-modal');
    utils.getEl('submission-project-id').value = projectId;
    utils.getEl('submit-task-form').reset();
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    utils.getEl('submit-task-form').onsubmit = async (e) => {
        e.preventDefault();
        
        const submission = {
            comment: utils.getEl('submission-comment').value,
            file: utils.getEl('submission-file').files[0]?.name || 'لا يوجد'
        };
        
        try {
            await api.submitProjectTask(projectId, submission);
            utils.showSuccess('تم رفع المهمة بنجاح');
            app.closeModal('submit-task-modal');
            await app.renderProjectDetails(projectId);
        } catch (error) {
            utils.showError('حدث خطأ في رفع المهمة');
        }
    };
};

window.showUserProfileModal = async function(userId) {
    const modal = utils.getEl('user-profile-modal');
    const contentEl = utils.getEl('user-profile-modal-content');
    
    const users = await api.getUsers();
    const user = users.find(u => u._id === userId);
    const projects = await api.getProjects();
    const tasks = projects.filter(p => 
        p.currentStage && 
        p.currentStage.assignedTo?._id === userId && 
        p.status === 'جاري'
    );
    
    contentEl.innerHTML = `
        <div class="flex items-center mb-6">
            ${user.avatar 
                ? `<img src="${user.avatar}" class="w-20 h-20 rounded-full object-cover mr-6">`
                : `<div class="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl mr-6" 
                    style="background-color: ${utils.generateAvatarColor(user.name)}">
                    ${utils.getInitials(user.name).toUpperCase()}
                </div>`
            }
            <div>
                <h3 class="text-2xl font-bold">${user.name}</h3>
                <p class="text-muted">${user.roleId?.name || 'N/A'}</p>
                <p class="text-muted">${user.departmentId?.name || ''}</p>
            </div>
            <button class="mr-auto text-gray-400" onclick="app.closeModal('user-profile-modal')">
                <i class="fas fa-times fa-2x"></i>
            </button>
        </div>
        <div>
            <h4 class="font-bold mb-4">المهام الحالية (${tasks.length})</h4>
            <div class="space-y-3 max-h-64 overflow-y-auto">
                ${tasks.map(p => `
                    <div class="p-3 border rounded-lg">
                        <p class="font-semibold">${p.currentStage.name}</p>
                        <p class="text-sm">المشروع: 
                            <a href="#" class="text-primary" 
                                onclick="event.preventDefault(); app.navigateTo('project-details', {projectId: '${p._id}'})">
                                ${p.name}
                            </a>
                        </p>
                        <p class="text-xs text-red-500">
                            الموعد: ${utils.formatDate(p.currentStage.stageDeadline)}
                        </p>
                    </div>
                `).join('') || '<p class="text-muted">لا توجد مهام حالية.</p>'}
            </div>
        </div>
    `;
    
    modal.classList.add('flex');
    modal.classList.remove('hidden');
};

window.printInvoice = async function(invoiceId) {
    const invoices = await api.getInvoices();
    const invoice = invoices.find(i => i._id === invoiceId);
    const settings = await api.getInvoiceSettings();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>فاتورة ${invoice.invoiceNumber}</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Cairo', sans-serif; direction: rtl; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body class="bg-gray-100 p-8">
                <div class="max-w-4xl mx-auto bg-white p-10 rounded-lg shadow-lg">
                    <div class="flex justify-between items-start mb-10">
                        <div>
                            ${settings.companyLogo ? 
                                `<img src="${settings.companyLogo}" alt="Company Logo" class="h-16 mb-4">` : ''}
                            <h1 class="text-2xl font-bold">${settings.companyName || 'اسم الشركة'}</h1>
                            <p class="text-gray-600">${settings.companyAddress || 'عنوان الشركة'}</p>
                            <p class="text-gray-600">${settings.companyExtra || ''}</p>
                        </div>
                        <div class="text-left">
                            <h2 class="text-3xl font-bold text-gray-800">فاتورة</h2>
                            <p class="text-gray-600">#${invoice.invoiceNumber}</p>
                            <p class="mt-2"><b>تاريخ الإصدار:</b> ${utils.formatDate(invoice.issueDate)}</p>
                            <p><b>تاريخ الاستحقاق:</b> ${utils.formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>
                    <div class="mb-10">
                        <h3 class="text-lg font-bold mb-2">بيانات العميل:</h3>
                        <p class="text-gray-700">${invoice.clientId?.name || 'N/A'}</p>
                        <p class="text-gray-700">${invoice.clientId?.contact || ''}</p>
                    </div>
                    <table class="w-full text-right mb-10">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-3">الوصف</th>
                                <th class="p-3 text-left">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b">
                                <td class="p-3">خدمات (${invoice.projectId?.name || 'مشروع'})</td>
                                <td class="p-3 text-left">${invoice.amount} ج.م</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="text-left">
                        <p class="text-gray-600">المجموع الفرعي: ${invoice.amount} ج.م</p>
                        <p class="text-2xl font-bold mt-2">الإجمالي: ${invoice.amount} ج.م</p>
                    </div>
                    <div class="mt-16 text-center text-gray-500 text-sm">
                        <p>شكرًا لتعاملكم معنا!</p>
                    </div>
                    <div class="mt-8 text-center no-print">
                        <button onclick="window.print()" class="bg-blue-500 text-white py-2 px-4 rounded">طباعة</button>
                    </div>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
};