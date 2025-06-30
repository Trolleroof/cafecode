import React from 'react';
import { BracketsCurly, Globe, Chat, Envelope } from 'phosphor-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <div className="bg-gradient-to-r from-[#094074] to-[#5adbff] p-2 rounded-lg">
                <BracketsCurly className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">CodeCraft IDE</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Empowering the next generation of developers with an intuitive, 
              beginner-friendly coding environment that makes learning to code accessible to everyone.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#5adbff] transition-colors">
                <Globe className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#5adbff] transition-colors">
                <Chat className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#5adbff] transition-colors">
                <Globe className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#5adbff] transition-colors">
                <Envelope className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Product</h3>
            <ul className="space-y-4">
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Changelog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Roadmap</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Support</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tutorials</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Community</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2025 CodeCraft IDE. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;