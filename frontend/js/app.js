class SonaaApp {
    constructor() {
        this.currentSection = null;
        this.init();
    }

    async init() {
        await this.handleAuth();
    }

    async handleAuth() {
        const isAuthenticated = await auth.checkAuth();
        if (isAuthenticated) {
            this.showApp();
        } else {
            this.showAuth();
        }

        utils.getEl('login-form-element').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.login();
        });
    }

    async login() {
        const email = utils.getEl('login-email').value;
        const password = utils.getEl('login-password').value;
        
        utils.showLoading();
        const result = await auth.login(email, password);
        utils.hideLoading();

        if (result.success) {
            this.showApp();
        } else {
            utils.getEl('login-error').classList.remove('hidden');
            utils.getEl('login-error').textContent = result.error || 'خطأ في البيانات المدخلة';
        }
    }

    logout() {
        auth.logout();
        this.showAuth();
    }

    showAuth() {
        utils.getEl('auth-container').classList.remove('hidden');
        utils.getEl('app-container').classList.add('hidden');
    }

    showApp() {
        utils.getEl('auth-container').classList.add('hidden');
        utils.getEl('app-container').classList.remove('hidden');
        this.setupAppUI();
        this.navigateTo('dashboard');
    }

    setupAppUI() {
        const user = auth.currentUser;
        utils.getEl('sidebar-username').textContent = user.name;
        utils.getEl('sidebar-user-role-name').textContent = user.roleId?.name || 'N/A';

        const avatarImg = utils.getEl('sidebar-avatar-img');
        const avatarInitials = utils.getEl('sidebar-avatar-initials');
        
        if (user.avatar) {
            avatarImg.src = user.avatar;
            avatarImg.classList.remove('hidden');
            avatarInitials.classList.add('hidden');
        } else {
            avatarInitials.style.backgroundColor = utils.generateAvatarColor(user.name);
            avatarInitials.textContent = utils.getInitials(user.name).toUpperCase();
            avatarInitials.classList.remove('hidden');
            avatarImg.classList.add('hidden');
        }

        this.renderSidebarNav();
        utils.getEl('logout-btn').addEventListener('click', () => this.logout());
    }

    renderSidebarNav() {
        const navContainer = utils.getEl('sidebar-nav');
        navContainer.innerHTML = '';
        
        const navItems = [
            { id: 'dashboard', name: 'لوحة التحكم', icon: 'fa-home', roles: ['all'] },
            { id: 'my-tasks', name: 'مهامي', icon: 'fa-check-square', roles: ['all'] },
            { id: 'my-reports', name: 'تقاريري', icon: 'fa-chart-pie', roles: ['all'] },
            { id: 'calendar', name: 'التقويم', icon: 'fa-calendar-alt', roles: ['all'] },
            { header: 'إدارة المشاريع' },
            { id: 'projects', name: 'المشاريع', icon: 'fa-tasks', permissions: ['canSeeAllProjects'] },
            { id: 'team', name: 'إدارة الفريق', icon: 'fa-users-cog', permissions: ['canManageTeam'] },
            { id: 'clients', name: 'العملاء', icon: 'fa-users', permissions: ['canAddClient'] },
            { header: 'المبيعات', permissions: ['canManageSales'] },
            { id: 'leads', name: 'العملاء المحتملين', icon: 'fa-filter', permissions: ['canManageSales'] },
            { id: 'opportunities', name: 'الفرص', icon: 'fa-lightbulb', permissions: ['canManageSales'] },
            { id: 'invoices', name: 'الفواتير', icon: 'fa-file-invoice-dollar', permissions: ['canManageSales'] },
            { header: 'التقارير والإعدادات' },
            { id: 'reports', name: 'تقارير النظام', icon: 'fa-chart-line', permissions: ['canSeeReports'] },
            { id: 'settings', name: 'إعدادات النظام', icon: 'fa-cog', roles: ['Admin'] },
            { id: 'my-settings', name: 'إعداداتي', icon: 'fa-user-cog', roles: ['all'] }
        ];

        navItems.forEach(item => {
            if (item.header) {
                let hasAccess = false;
                if (item.permissions) {
                    hasAccess = item.permissions.some(p => auth.hasPermission(p));
                } else {
                    hasAccess = true;
                }
                
                if (hasAccess) {
                    const headerEl = document.createElement('div');
                    headerEl.className = 'nav-header';
                    headerEl.textContent = item.header;
                    navContainer.appendChild(headerEl);
                }
                return;
            }

            let hasAccess = false;
            if (item.roles && item.roles.includes('all')) hasAccess = true;
            if (item.roles && item.roles.includes(auth.currentUser.roleId?.name)) hasAccess = true;
            if (item.permissions && item.permissions.some(p => auth.hasPermission(p))) hasAccess = true;

            if (hasAccess) {
                const navEl = document.createElement('div');
                navEl.className = 'nav-item';
                navEl.dataset.section = item.id;
                navEl.innerHTML = `<i class="fas ${item.icon} ml-3 w-5 text-center"></i> ${item.name}`;
                navEl.addEventListener('click', () => this.navigateTo(item.id));
                navContainer.appendChild(navEl);
            }
        });
    }

    async navigateTo(sectionId, options = {}) {
        this.currentSection = sectionId;
        
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
        if (activeNav) activeNav.classList.add('active');

        utils.getEl('section-actions').innerHTML = '';
        const mainContent = utils.getEl('main-content');
        mainContent.innerHTML = '';

        try {
            utils.showLoading();
            
            switch(sectionId) {
                case 'dashboard':
                    utils.getEl('section-title').textContent = 'لوحة التحكم';
                    await this.renderDashboard();
                    break;
                case 'projects':
                    utils.getEl('section-title').textContent = 'المشاريع';
                    await this.renderProjects();
                    break;
                case 'project-details':
                    await this.renderProjectDetails(options.projectId);
                    break;
                case 'clients':
                    utils.getEl('section-title').textContent = 'العملاء';
                    await this.renderClients();
                    break;
                case 'my-tasks':
                    utils.getEl('section-title').textContent = 'مهامي';
                    await this.renderMyTasks();
                    break;
                case 'team':
                    utils.getEl('section-title').textContent = 'إدارة الفريق';
                    await this.renderTeam();
                    break;
                case 'settings':
                    utils.getEl('section-title').textContent = 'إعدادات النظام';
                    await this.renderSettings();
                    break;
                case 'reports':
                    utils.getEl('section-title').textContent = 'تقارير النظام';
                    await this.renderSystemReports();
                    break;
                case 'my-reports':
                    utils.getEl('section-title').textContent = 'تقاريري';
                    await this.renderMyReports();
                    break;
                case 'my-settings':
                    utils.getEl('section-title').textContent = 'إعداداتي';
                    await this.renderMySettings();
                    break;
                case 'calendar':
                    utils.getEl('section-title').textContent = 'التقويم';
                    await this.renderCalendar();
                    break;
                case 'leads':
                    utils.getEl('section-title').textContent = 'العملاء المحتملين';
                    await this.renderLeads();
                    break;
                case 'opportunities':
                    utils.getEl('section-title').textContent = 'الفرص';
                    await this.renderOpportunities();
                    break;
                case 'invoices':
                    utils.getEl('section-title').textContent = 'الفواتير';
                    await this.renderInvoices();
                    break;
                default:
                    utils.getEl('section-title').textContent = 'قيد التطوير';
                    mainContent.innerHTML = `
                        <div class="card text-center">
                            <i class="fas fa-wrench fa-3x text-gray-400 mb-4"></i>
                            <h3 class="text-2xl font-bold">قيد التطوير</h3>
                            <p class="text-muted">هذه الصفحة قيد التطوير حاليًا.</p>
                        </div>
                    `;
            }
        } catch (error) {
            utils.showError('حدث خطأ في تحميل البيانات');
            console.error(error);
        } finally {
            utils.hideLoading();
        }
    }

    async renderDashboard() {
        const [stats, projects] = await Promise.all([
            api.getDashboardStats(),
            api.getProjects()
        ]);
        
        utils.getEl('main-content').innerHTML = components.renderDashboard(stats, projects);
    }

    async renderProjects() {
        if (auth.hasPermission('canAddProject')) {
            utils.getEl('section-actions').innerHTML = `
                <button class="btn btn-primary" onclick="app.showProjectModal()">
                    <i class="fas fa-plus ml-2"></i>مشروع جديد
                </button>
            `;
        }

        const projects = await api.getProjects();
        utils.getEl('main-content').innerHTML = components.renderProjectsTable(projects.reverse());
        
        document.querySelectorAll('.project-row').forEach(row => {
            row.addEventListener('click', () => {
                this.navigateTo('project-details', { projectId: row.dataset.projectId });
            });
        });
    }

    async renderProjectDetails(projectId) {
        const project = await api.getProject(projectId);
        
        if (!project) {
            utils.getEl('main-content').innerHTML = 'Project not found';
            return;
        }

        utils.getEl('section-title').textContent = project.name;
        utils.getEl('section-actions').innerHTML = `
            <button class="btn" onclick="app.showProjectModal('${projectId}')">
                <i class="fas fa-edit mr-2"></i>تعديل
            </button>
        `;

        const typeLabels = {
            'one-time': 'مشروع لمرة واحدة',
            'subscription': 'اشتراك شهري',
            'maintenance': 'صيانة دورية'
        };

        let actionButton = '';
        if (project.currentStage && auth.currentUser._id === project.currentStage.assignedTo?._id) {
            if (project.currentStage.status === 'جاري') {
                actionButton = `
                    <button class="btn btn-primary" onclick="app.showSubmitTaskModal('${projectId}')">
                        <i class="fas fa-upload mr-2"></i>رفع المهمة
                    </button>
                `;
            } else if (project.currentStage.status === 'يحتاج تعديل') {
                actionButton = `
                    <button class="btn bg-yellow-500 text-white" onclick="app.showSubmitTaskModal('${projectId}')">
                        <i class="fas fa-redo mr-2"></i>إعادة الرفع
                    </button>
                `;
            }
        }

        if (project.currentStage?.status === 'مراجعة' && auth.hasPermission('canApproveStages')) {
            actionButton = `
                <div class="flex gap-2">
                    <button class="btn btn-primary" onclick="app.handleApproveStage('${projectId}')">
                        <i class="fas fa-check-circle mr-2"></i>اعتماد
                    </button>
                    <button class="btn bg-yellow-400 text-white" onclick="app.handleRequestRevision('${projectId}')">
                        <i class="fas fa-exclamation-triangle mr-2"></i>طلب تعديل
                    </button>
                </div>
            `;
        }

        utils.getEl('main-content').innerHTML = `
            <div class="card mb-6">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-muted">العميل: <span class="text-primary">${project.clientId?.name || 'N/A'}</span></p>
                        <p class="text-muted">نوع المشروع: <span class="font-bold">${typeLabels[project.projectType]}</span></p>
                        <p class="text-muted">الموعد النهائي: <span class="font-bold">${utils.formatDate(project.projectDeadline)}</span></p>
                    </div>
                    <div class="text-left">${actionButton}</div>
                </div>
                ${project.projectDescription ? `
                    <div class="mt-4 pt-4 border-t">
                        <h4 class="font-bold mb-2">وصف المشروع</h4>
                        <p class="text-muted whitespace-pre-wrap">${project.projectDescription}</p>
                    </div>
                ` : ''}
            </div>
            <div class="card">
                <h3 class="font-bold text-lg mb-6">مراحل المشروع</h3>
                ${components.renderProjectTimeline(project)}
            </div>
        `;
    }

    async renderClients() {
        if (auth.hasPermission('canAddClient')) {
            utils.getEl('section-actions').innerHTML = `
                <button class="btn btn-primary" onclick="app.showAddClientModal()">
                    <i class="fas fa-plus ml-2"></i>عميل جديد
                </button>
            `;
        }

        const clients = await api.getClients();
        utils.getEl('main-content').innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${clients.map(c => `
                    <div class="card cursor-pointer">
                        <h4 class="font-bold">${c.name}</h4>
                        <p class="text-sm text-muted">${c.contact || ''}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async renderMyTasks() {
        const projects = await api.getProjects();
        const myTasks = projects.filter(p => 
            p.currentStage && 
            p.currentStage.assignedTo?._id === auth.currentUser._id && 
            p.status === 'جاري'
        );

        if (myTasks.length === 0) {
            utils.getEl('main-content').innerHTML = `
                <div class="card">
                    <p>لا توجد مهام مسندة إليك حاليًا. أحسنت!</p>
                </div>
            `;
            return;
        }

        utils.getEl('main-content').innerHTML = `
            <div>
                ${myTasks.map(p => `
                    <div class="card mb-4 cursor-pointer project-row" data-project-id="${p._id}">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-sm text-muted">المشروع: ${p.name}</p>
                                <p class="font-bold text-lg">${p.currentStage.name}</p>
                                <p class="text-sm font-bold text-red-600">
                                    الموعد: ${utils.formatDate(p.currentStage.stageDeadline)}
                                </p>
                            </div>
                            <div class="text-left">
                                <p class="text-sm text-muted">العميل</p>
                                <p class="font-semibold">${p.clientId?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('.project-row').forEach(row => {
            row.addEventListener('click', () => {
                this.navigateTo('project-details', { projectId: row.dataset.projectId });
            });
        });
    }

    async renderTeam() {
        utils.getEl('main-content').innerHTML = `
            <div class="border-b border-gray-200 mb-4">
                <nav class="-mb-px flex gap-6" id="team-tabs">
                    <button data-tab="members" class="tab-button active">أعضاء الفريق</button>
                    <button data-tab="workload" class="tab-button">توزيع المهام</button>
                </nav>
            </div>
            <div id="team-content"></div>
        `;

        const tabs = utils.getEl('team-tabs');
        const contentContainer = utils.getEl('team-content');

        const switchTab = async (tabName) => {
            tabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            tabs.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            
            if (tabName === 'members') {
                await this.renderTeamMembers(contentContainer);
            } else {
                await this.renderTeamWorkload(contentContainer);
            }
        };

        tabs.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        await switchTab('members');
    }

    async renderTeamMembers(container) {
        if (auth.hasPermission('canManageTeam')) {
            utils.getEl('section-actions').innerHTML = `
                <button class="btn btn-primary" onclick="app.showUserModal()">
                    <i class="fas fa-plus ml-2"></i>مستخدم جديد
                </button>
            `;
        }

        const [users, roles] = await Promise.all([
            api.getUsers(),
            api.getRoles()
        ]);

        container.innerHTML = components.renderTeamMembers(users, roles);
    }

    async renderTeamWorkload(container) {
        utils.getEl('section-actions').innerHTML = '';
        
        const [users, projects] = await Promise.all([
            api.getUsers(),
            api.getProjects()
        ]);

        const activeProjects = projects.filter(p => p.status === 'جاري' && p.currentStage);

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${users.map(user => {
                    const tasks = activeProjects.filter(p => p.currentStage.assignedTo?._id === user._id);
                    return `
                        <div class="card mb-4 cursor-pointer hover:shadow-primary" onclick="app.showUserProfileModal('${user._id}')">
                            <div class="flex items-center mb-4">
                                ${user.avatar 
                                    ? `<img src="${user.avatar}" class="w-12 h-12 rounded-full object-cover mr-4">`
                                    : `<div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4" style="background-color: ${utils.generateAvatarColor(user.name)}">${utils.getInitials(user.name).toUpperCase()}</div>`
                                }
                                <div>
                                    <h4 class="font-bold text-lg">${user.name}</h4>
                                    <p class="text-sm text-muted">عدد المهام: ${tasks.length}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    async renderSettings() {
        if (!auth.isAdmin()) {
            utils.getEl('main-content').innerHTML = `
                <div class="card">ليس لديك صلاحية لعرض هذه الصفحة.</div>
            `;
            return;
        }

        const [settings, roles, departments] = await Promise.all([
            api.getInvoiceSettings(),
            api.getRoles(),
            api.getDepartments()
        ]);

        utils.getEl('main-content').innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <div class="card mb-6">
                        <h3 class="text-xl font-bold mb-4">الأدوار والصلاحيات</h3>
                        <button class="btn btn-primary mb-4 w-full" onclick="app.showRoleModal()">
                            إضافة دور جديد
                        </button>
                        <div class="space-y-2">
                            ${roles.map(r => `
                                <div class="flex justify-between items-center p-2 border rounded-lg">
                                    <span class="font-bold">${r.name}</span>
                                    <div>
                                        <button class="text-gray-500 hover:text-primary" onclick="app.showRoleModal('${r._id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${r.name !== 'Admin' ? `
                                            <button class="text-red-500 hover:text-red-700 mr-2" onclick="app.handleDeleteRole('${r._id}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="card">
                        <h3 class="text-xl font-bold mb-4">الأقسام</h3>
                        <div class="mb-6 space-y-2">
                            ${departments.map(d => `
                                <div class="flex justify-between items-center p-2 border-b">
                                    <span>${d.name}</span>
                                    <button class="text-red-500 hover:text-red-700" onclick="app.handleDeleteDepartment('${d._id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        <form id="add-department-form" class="flex gap-4 items-end">
                            <div class="flex-1">
                                <label class="block text-sm font-bold">اسم القسم</label>
                                <input type="text" id="dept-name" class="form-input" required>
                            </div>
                            <button type="submit" class="btn btn-primary">إضافة</button>
                        </form>
                    </div>
                </div>

                <div class="card">
                    <h3 class="text-xl font-bold mb-4">إعدادات الفواتير</h3>
                    <form id="invoice-settings-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold">شعار الشركة</label>
                            <input type="file" id="company-logo" class="form-input" accept="image/*">
                        </div>
                        <div>
                            <label class="block text-sm font-bold">اسم الشركة</label>
                            <input type="text" id="company-name" class="form-input" value="${settings.companyName || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-bold">عنوان الشركة</label>
                            <textarea id="company-address" class="form-textarea">${settings.companyAddress || ''}</textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-bold">معلومات إضافية (رقم الهاتف)</label>
                            <input type="text" id="company-extra" class="form-input" value="${settings.companyExtra || ''}">
                        </div>
                        <button type="submit" class="btn btn-primary w-full">حفظ الإعدادات</button>
                    </form>
                </div>
            </div>
        `;

        utils.getEl('add-department-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.handleAddDepartment();
        };

        utils.getEl('invoice-settings-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.handleSaveInvoiceSettings();
        };
    }

    async handleAddDepartment() {
        const name = utils.getEl('dept-name').value;
        if (!name) return;
        
        try {
            await api.createDepartment(name);
            utils.showSuccess('تم إضافة القسم بنجاح');
            await this.renderSettings();
        } catch (error) {
            utils.showError('حدث خطأ في إضافة القسم');
        }
    }

    async handleDeleteDepartment(deptId) {
        if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
            try {
                await api.deleteDepartment(deptId);
                utils.showSuccess('تم حذف القسم بنجاح');
                await this.renderSettings();
            } catch (error) {
                utils.showError('حدث خطأ في حذف القسم');
            }
        }
    }

    async handleSaveInvoiceSettings() {
        const settings = {
            companyName: utils.getEl('company-name').value,
            companyAddress: utils.getEl('company-address').value,
            companyExtra: utils.getEl('company-extra').value
        };

        const logoFile = utils.getEl('company-logo').files[0];
        if (logoFile) {
            settings.companyLogo = await utils.fileToBase64(logoFile);
        }

        try {
            await api.updateInvoiceSettings(settings);
            utils.showSuccess('تم حفظ الإعدادات بنجاح');
        } catch (error) {
            utils.showError('حدث خطأ في حفظ الإعدادات');
        }
    }

    async renderMySettings() {
        utils.getEl('main-content').innerHTML = `
            <div class="card max-w-lg mx-auto">
                <h3 class="text-xl font-bold mb-4">الإعدادات الشخصية</h3>
                <form id="my-settings-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold">الصورة الشخصية</label>
                        <input type="file" id="my-avatar" class="form-input" accept="image/*">
                    </div>
                    <div>
                        <label class="block text-sm font-bold">كلمة المرور الجديدة</label>
                        <input type="password" id="my-password" class="form-input" placeholder="اتركه فارغًا إذا لم ترد التغيير">
                    </div>
                    <div class="flex justify-end pt-4">
                        <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                    </div>
                </form>
            </div>
        `;

        utils.getEl('my-settings-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.handleUpdateMySettings();
        };
    }

    async handleUpdateMySettings() {
        const updates = {};
        const password = utils.getEl('my-password').value;
        const avatarFile = utils.getEl('my-avatar').files[0];

        if (password) {
            updates.password = password;
        }

        if (avatarFile) {
            updates.avatar = await utils.fileToBase64(avatarFile);
        }

        try {
            await api.updateUser(auth.currentUser._id, updates);
            utils.showSuccess('تم تحديث البيانات بنجاح');
            
            const updatedUser = await api.getCurrentUser();
            auth.currentUser = updatedUser.user;
            this.setupAppUI();
        } catch (error) {
            utils.showError('حدث خطأ في تحديث البيانات');
        }
    }

    async renderSystemReports() {
        utils.getEl('main-content').innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card"><canvas id="projectsChart"></canvas></div>
                <div class="card"><canvas id="tasksChart"></canvas></div>
            </div>
        `;
        
        await this.renderProjectsChart();
        await this.renderTasksChart();
    }

    async renderProjectsChart() {
        const projects = await api.getProjects();
        const statusCounts = projects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {});

        new Chart(utils.getEl('projectsChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    label: 'المشاريع',
                    data: Object.values(statusCounts),
                    backgroundColor: ['#10B981', '#3B82F6', '#EF4444', '#FBBF24']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'حالة المشاريع' }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    async renderTasksChart() {
        const projects = await api.getProjects();
        const activeProjects = projects.filter(p => p.status === 'جاري' && p.currentStage);
        
        const taskCounts = activeProjects.reduce((acc, p) => {
            const userId = p.currentStage.assignedTo?._id;
            if (userId) {
                const userName = p.currentStage.assignedTo.name;
                acc[userName] = (acc[userName] || 0) + 1;
            }
            return acc;
        }, {});

        new Chart(utils.getEl('tasksChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(taskCounts),
                datasets: [{
                    label: 'المهام الحالية',
                    data: Object.values(taskCounts),
                    backgroundColor: Object.keys(taskCounts).map(name => utils.generateAvatarColor(name))
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'توزيع المهام على الفريق' }
                }
            }
        });
    }

    async renderMyReports() {
        utils.getEl('main-content').innerHTML = `
            <div class="max-w-2xl mx-auto">
                <div class="card"><canvas id="myTasksStatusChart"></canvas></div>
            </div>
        `;

        const projects = await api.getProjects();
        const myCompletedStages = projects.flatMap(p => p.completedStages)
            .filter(s => s.assignedTo?._id === auth.currentUser._id);

        let onTime = 0, late = 0;
        myCompletedStages.forEach(stage => {
            if (stage.stageDeadline && stage.completionDate) {
                if (new Date(stage.completionDate) <= new Date(stage.stageDeadline)) {
                    onTime++;
                } else {
                    late++;
                }
            }
        });

        if (onTime === 0 && late === 0) {
            utils.getEl('main-content').innerHTML = `
                <div class="card text-center">
                    <p class="text-muted">لا توجد بيانات كافية لعرض التقرير.</p>
                </div>
            `;
            return;
        }

        new Chart(utils.getEl('myTasksStatusChart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['في الوقت المحدد', 'متأخر'],
                datasets: [{
                    data: [onTime, late],
                    backgroundColor: ['#34D399', '#EF4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'أداء المهام'
                    }
                }
            }
        });
    }

    async renderCalendar() {
        utils.getEl('main-content').innerHTML = `
            <div class="card"><div id="calendar-container"></div></div>
        `;
        
        const calendarEl = utils.getEl('calendar-container');
        const projects = await api.getProjects();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const projectEvents = projects.map(p => {
            let color = '#FBBF24';
            if (p.status === 'مكتمل') {
                color = '#10B981';
            } else if (new Date(p.projectDeadline) < today) {
                color = '#EF4444';
            }
            
            return {
                title: `مشروع: ${p.name}`,
                start: p.projectDeadline,
                allDay: true,
                backgroundColor: color,
                borderColor: color,
                extendedProps: { type: 'project', id: p._id }
            };
        });

        let taskEvents = [];
        const taskSource = auth.hasPermission('canSeeAllProjects') 
            ? projects 
            : projects.filter(p => 
                (p.currentStage && p.currentStage.assignedTo?._id === auth.currentUser._id) ||
                (p.completedStages.some(s => s.assignedTo?._id === auth.currentUser._id)) ||
                (p.workflow.some(s => s.assignedTo?._id === auth.currentUser._id))
            );

        taskSource.forEach(p => {
            const allUserStages = [
                ...p.completedStages,
                ...(p.currentStage ? [p.currentStage] : []),
                ...p.workflow
            ].filter(s => 
                s.assignedTo?._id === auth.currentUser._id || 
                auth.hasPermission('canSeeAllProjects')
            );

            allUserStages.forEach(stage => {
                if (stage.stageDeadline) {
                    const userInitial = auth.hasPermission('canSeeAllProjects') && stage.assignedTo
                        ? ` (${stage.assignedTo.name.split(' ')[0]})`
                        : '';
                    
                    taskEvents.push({
                        title: `مرحلة: ${stage.name}${userInitial}`,
                        start: stage.stageDeadline,
                        allDay: true,
                        backgroundColor: '#6366F1',
                        borderColor: '#6366F1',
                        extendedProps: { type: 'project', id: p._id }
                    });
                }
            });
        });

        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ar',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: [...projectEvents, ...taskEvents],
            eventClick: (info) => {
                const { type, id } = info.event.extendedProps;
                if (type === 'project') {
                    this.navigateTo('project-details', { projectId: id });
                }
            }
        });
        
        calendar.render();
    }

    async renderLeads() {
        utils.getEl('section-actions').innerHTML = `
            <button class="btn btn-primary" onclick="app.showLeadModal()">
                <i class="fas fa-plus ml-2"></i>عميل محتمل جديد
            </button>
        `;

        const leads = await api.getLeads();
        utils.getEl('main-content').innerHTML = `
            <div class="card overflow-x-auto">
                <table class="w-full text-right">
                    <thead>
                        <tr class="border-b">
                            <th class="p-4">الاسم</th>
                            <th class="p-4">المصدر</th>
                            <th class="p-4">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leads.map(lead => `
                            <tr class="border-b">
                                <td class="p-4 font-bold">${lead.name}</td>
                                <td class="p-4">${lead.source}</td>
                                <td class="p-4">
                                    <span class="badge status-${lead.status}">${lead.status}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async renderOpportunities() {
        utils.getEl('section-actions').innerHTML = `
            <button class="btn btn-primary" onclick="app.showOpportunityModal()">
                <i class="fas fa-plus ml-2"></i>فرصة جديدة
            </button>
        `;

        const opportunities = await api.getOpportunities();
        utils.getEl('main-content').innerHTML = `
            <div class="card overflow-x-auto">
                <table class="w-full text-right">
                    <thead>
                        <tr class="border-b">
                            <th class="p-4">الاسم</th>
                            <th class="p-4">العميل</th>
                            <th class="p-4">القيمة</th>
                            <th class="p-4">المرحلة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${opportunities.map(opp => `
                            <tr class="border-b">
                                <td class="p-4 font-bold">${opp.name}</td>
                                <td class="p-4">${opp.clientId?.name || ''}</td>
                                <td class="p-4">${opp.value} ج.م</td>
                                <td class="p-4">
                                    <span class="badge status-${opp.stage}">${opp.stage}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async renderInvoices() {
        utils.getEl('section-actions').innerHTML = `
            <button class="btn btn-primary" onclick="app.showInvoiceModal()">
                <i class="fas fa-plus ml-2"></i>فاتورة جديدة
            </button>
        `;

        const invoices = await api.getInvoices();
        utils.getEl('main-content').innerHTML = `
            <div class="card overflow-x-auto">
                <table class="w-full text-right">
                    <thead>
                        <tr class="border-b">
                            <th class="p-4">رقم الفاتورة</th>
                            <th class="p-4">العميل</th>
                            <th class="p-4">المبلغ</th>
                            <th class="p-4">تاريخ الاستحقاق</th>
                            <th class="p-4">الحالة</th>
                            <th class="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoices.map(inv => `
                            <tr class="border-b">
                                <td class="p-4 font-bold">#${inv.invoiceNumber}</td>
                                <td class="p-4">${inv.clientId?.name || 'N/A'}</td>
                                <td class="p-4">${inv.amount} ج.م</td>
                                <td class="p-4">${utils.formatDate(inv.dueDate)}</td>
                                <td class="p-4">
                                    <span class="badge status-${inv.status}">${inv.status}</span>
                                </td>
                                <td class="p-4">
                                    <button class="text-primary" onclick="app.printInvoice('${inv._id}')">
                                        <i class="fas fa-print"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    closeModal(modalId) {
        const modal = utils.getEl(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    showProjectModal(projectId = null) {
        this.closeModal('project-modal');
        window.showProjectModal(projectId);
    }

    showAddClientModal() {
        this.closeModal('add-client-modal');
        window.showAddClientModal();
    }

    showUserModal() {
        this.closeModal('add-user-modal');
        window.showUserModal();
    }

    showRoleModal(roleId = null) {
        this.closeModal('add-role-modal');
        window.showRoleModal(roleId);
    }

    showLeadModal() {
        this.closeModal('lead-modal');
        window.showLeadModal();
    }

    showOpportunityModal() {
        this.closeModal('opportunity-modal');
        window.showOpportunityModal();
    }

    showInvoiceModal() {
        this.closeModal('invoice-modal');
        window.showInvoiceModal();
    }

    showSubmitTaskModal(projectId) {
        this.closeModal('submit-task-modal');
        window.showSubmitTaskModal(projectId);
    }

    showUserProfileModal(userId) {
        this.closeModal('user-profile-modal');
        window.showUserProfileModal(userId);
    }

    async handleApproveStage(projectId) {
        if (confirm('هل أنت متأكد من اعتماد هذه المرحلة؟')) {
            try {
                await api.approveProjectStage(projectId);
                utils.showSuccess('تم اعتماد المرحلة بنجاح');
                await this.renderProjectDetails(projectId);
            } catch (error) {
                utils.showError('حدث خطأ في اعتماد المرحلة');
            }
        }
    }

    async handleRequestRevision(projectId) {
        const notes = prompt('أدخل ملاحظات التعديل المطلوبة:');
        if (!notes) return;

        try {
            await api.requestProjectRevision(projectId, notes);
            utils.showSuccess('تم إرسال طلب التعديل');
            await this.renderProjectDetails(projectId);
        } catch (error) {
            utils.showError('حدث خطأ في إرسال طلب التعديل');
        }
    }

    async handleDeleteRole(roleId) {
        if (confirm('هل أنت متأكد من حذف هذا الدور؟ سيتأثر جميع المستخدمين المرتبطين به.')) {
            try {
                await api.deleteRole(roleId);
                utils.showSuccess('تم حذف الدور بنجاح');
                await this.renderSettings();
            } catch (error) {
                utils.showError('حدث خطأ في حذف الدور');
            }
        }
    }

    async printInvoice(invoiceId) {
        window.printInvoice(invoiceId);
    }
}

const app = new SonaaApp();
window.app = app;