# 🏢 ERP System Web Application

A comprehensive Enterprise Resource Planning (ERP) system built with React frontend and Node.js backend, featuring modular architecture with full integration between HR, Manufacturing, SCM, CRM, Sales, Inventory, and Purchasing modules.

## 🚀 Features

### 📊 Dashboard & Analytics
- Real-time KPIs and metrics
- Interactive charts and visualizations
- Recent activities feed
- System performance monitoring

### 👥 HR Module
- Employee management (CRUD operations)
- Attendance tracking with check-in/check-out
- Working hours calculation
- Payroll integration
- Performance tracking

### 🏭 Manufacturing Module
- Production order management
- Employee assignment to operations
- Material consumption tracking
- Automatic inventory updates
- Start/finish time tracking

### 🚚 Supply Chain Management (SCM)
- Supplier relationship management
- Performance evaluation and rating
- Product-supplier mapping
- Logistics coordination

### 🤝 Customer Relationship Management (CRM)
- Customer database management
- Lead tracking
- Customer interaction history
- Support ticket system (placeholder)

### 💰 Sales Module
- Sales order processing
- Customer order management
- Inventory validation
- Automatic production triggers
- Revenue tracking

### 📦 Inventory Module
- Product catalog management
- Stock level monitoring
- Low stock alerts
- Inventory transactions tracking
- Automatic stock updates

### 🛒 Purchasing Module
- Purchase order management
- Supplier order processing
- Auto-generated purchase requests
- Inventory integration
- Cost tracking

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Express Validator** - Input validation

## 📁 Project Structure

```
erp-system/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   │   ├── HR/
│   │   │   ├── Manufacturing/
│   │   │   ├── SCM/
│   │   │   ├── CRM/
│   │   │   ├── Sales/
│   │   │   ├── Inventory/
│   │   │   └── Purchasing/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── server/                 # Node.js backend
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── scripts/           # Utility scripts
│   ├── index.js
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd erp-system
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cd server
   cp config.env.example config.env
   # Edit config.env with your settings
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on your system
   mongod
   ```

5. **Seed the database (optional)**
   ```bash
   cd server
   npm run seed
   ```

6. **Start the development servers**
   ```bash
   npm run dev
   ```

This will start both the backend server (port 5000) and frontend development server (port 3000).

### Default Login Credentials

After seeding the database, you can use these credentials:

- **Admin**: admin@erp.com / password123
- **Manager**: manager@erp.com / password123
- **Employee**: employee@erp.com / password123

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### HR Module
- `GET /api/hr/employees` - Get all employees
- `POST /api/hr/employees` - Create employee
- `GET /api/hr/attendance` - Get attendance records
- `POST /api/hr/attendance/checkin` - Employee check-in
- `POST /api/hr/attendance/checkout` - Employee check-out

### Manufacturing
- `GET /api/manufacturing/production-orders` - Get production orders
- `POST /api/manufacturing/production-orders` - Create production order
- `PUT /api/manufacturing/production-orders/:id/start` - Start production
- `PUT /api/manufacturing/production-orders/:id/complete` - Complete production

### SCM
- `GET /api/scm/suppliers` - Get suppliers
- `POST /api/scm/suppliers` - Create supplier
- `PUT /api/scm/suppliers/:id` - Update supplier

### CRM
- `GET /api/crm/customers` - Get customers
- `POST /api/crm/customers` - Create customer
- `GET /api/crm/customers/:id/orders` - Get customer orders

### Sales
- `GET /api/sales/orders` - Get sales orders
- `POST /api/sales/orders` - Create sales order
- `PUT /api/sales/orders/:id/confirm` - Confirm order
- `PUT /api/sales/orders/:id/ship` - Ship order

### Inventory
- `GET /api/inventory/products` - Get products
- `POST /api/inventory/products` - Create product
- `GET /api/inventory/low-stock` - Get low stock alerts

### Purchasing
- `GET /api/purchasing/orders` - Get purchase orders
- `POST /api/purchasing/orders` - Create purchase order
- `PUT /api/purchasing/orders/:id/order` - Place order
- `PUT /api/purchasing/orders/:id/receive` - Receive order

### Dashboard
- `GET /api/dashboard/kpis` - Get dashboard KPIs
- `GET /api/dashboard/recent-activities` - Get recent activities
- `GET /api/dashboard/sales-chart` - Get sales chart data

## 🗄️ Database Models

### Core Models
- **User** - System users with roles and permissions
- **Employee** - Employee records linked to users
- **Attendance** - Employee attendance tracking

### Business Models
- **Product** - Inventory items (raw materials, components, finished goods)
- **Supplier** - Supplier information and relationships
- **Customer** - Customer database
- **SalesOrder** - Customer orders
- **PurchaseOrder** - Supplier orders
- **ProductionOrder** - Manufacturing orders
- **InventoryTransaction** - Stock movement tracking

## 🔐 Authentication & Authorization

The system uses JWT-based authentication with role-based access control:

- **Admin**: Full system access
- **Manager**: Department-specific management
- **Employee**: Basic operations and self-service

## 🔄 Module Integration

The ERP system features tight integration between modules:

1. **Sales → Manufacturing**: Automatic production order creation when items are out of stock
2. **Manufacturing → Inventory**: Automatic inventory updates when production completes
3. **Purchasing → Inventory**: Automatic stock updates when orders are received
4. **HR → Manufacturing**: Employee assignment to production operations
5. **Inventory → Purchasing**: Auto-generated purchase requests for low stock items

## 📊 Dashboard Features

- **Real-time KPIs**: Employee count, sales revenue, inventory value, etc.
- **Interactive Charts**: Sales trends, performance metrics
- **Activity Feed**: Recent system activities and updates
- **Status Monitoring**: Production status, order tracking, alerts

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Interface**: Clean, professional design with TailwindCSS
- **Interactive Components**: Modals, forms, data tables
- **Real-time Updates**: Live data updates and notifications
- **Accessibility**: Keyboard navigation and screen reader support

## 🚀 Production Deployment

### Environment Setup
1. Set production environment variables
2. Configure MongoDB connection string
3. Set secure JWT secret
4. Configure CORS settings

### Build Process
```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

### Docker Support (Optional)
```dockerfile
# Add Dockerfile for containerized deployment
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- Advanced reporting and analytics
- Mobile app development
- API rate limiting
- Advanced security features
- Multi-tenant support
- Advanced workflow automation
- Integration with external systems
- Advanced inventory forecasting
- Machine learning for demand prediction

---
#   g r a d u a t i o n _ p r o j e c t  
 #   g r a d u a t i o n _ p r o j e c t  
 